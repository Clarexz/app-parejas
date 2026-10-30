import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import {
  Chip,
  CloudOff,
  Divider,
  EmptyState,
  IconButton,
  LoadingLines,
  PencilNote,
  Screen,
  Stamp,
  Text,
} from '@/components';
import { useCouple } from '@/features/couple';
import { useCategories, useCategoryQuestions } from '@/features/questions';
import { categoryColor, categoryRowState } from '@/lib/questionsView';
import { useTheme } from '@/theme';

export default function CategoryScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { partner } = useCouple();
  const { categories } = useCategories();
  const list = useCategoryQuestions(slug);
  const category = categories.find((c) => c.slug === slug);
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';

  return (
    <Screen scroll refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      <View style={{ gap: spacing.lg }}>
        <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
          <IconButton name="back" accessibilityLabel="Volver" onPress={() => router.back()} />
        </View>
        <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
          {category ? (
            <Chip label={category.name} color={categoryColor(category.slug, category.intensity)} />
          ) : null}
          <Text variant="display" accessibilityRole="header">
            Más preguntas
          </Text>
          {category ? (
            <Text variant="body" muted>
              {category.description}
            </Text>
          ) : null}
        </View>

        {list.isLoading ? (
          <LoadingLines count={5} accessibilityLabel="Cargando las preguntas" />
        ) : list.isError ? (
          <EmptyState
            illustration={<CloudOff />}
            title="No pudimos abrir esta categoría"
            body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
            actionLabel="Reintentar"
            onAction={() => void list.refetch()}
          />
        ) : list.questions.length === 0 ? (
          <EmptyState
            illustration={<PencilNote />}
            title="Aquí todavía no hay preguntas"
            body="Cuando se agreguen, van a aparecer en este renglón."
          />
        ) : (
          <View>
            {list.questions.map((q, i) => {
              const state = categoryRowState(q);
              return (
                <View key={q.id}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={q.text}
                    onPress={() => router.push({ pathname: '/question', params: { id: q.id } })}
                    style={({ pressed }) => ({
                      minHeight: 64,
                      paddingVertical: spacing.md,
                      gap: spacing.sm,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text variant="body">{q.text}</Text>
                    {state === 'both' ? (
                      <Stamp tone="nopal">Contestaron los dos</Stamp>
                    ) : state === 'mine' ? (
                      <Text variant="small" muted>
                        Contestaste. Falta {partnerName}.
                      </Text>
                    ) : state === 'partner' ? (
                      <Text variant="small" tone="jamaica">
                        {partnerName} contestó. Te toca.
                      </Text>
                    ) : null}
                  </Pressable>
                  {i < list.questions.length - 1 ? <Divider /> : null}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}

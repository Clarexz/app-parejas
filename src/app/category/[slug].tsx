import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  Card,
  EmptyState,
  FruitDot,
  LoadingSymbol,
  Screen,
  ScreenHeader,
  Text,
} from '@/components';
import { useCouple } from '@/features/couple';
import { useCategories, useCategoryQuestions } from '@/features/questions';
import { usePairFruits } from '@/features/questions/components/usePairFruits';
import { categoryRowState } from '@/lib/questionsView';
import { useTheme } from '@/theme';

export default function CategoryScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { partner } = useCouple();
  const fruits = usePairFruits();
  const { categories } = useCategories();
  const list = useCategoryQuestions(slug);
  const category = categories.find((c) => c.slug === slug);
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';
  const done = list.questions.filter((q) => q.answered_by_me && q.answered_by_partner).length;

  return (
    <Screen scroll refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <ScreenHeader title={category?.name ?? 'Preguntas'} back="Preguntas" />
          {category ? (
            <Text variant="body" tone="muted">
              {category.description}
            </Text>
          ) : null}
          {list.questions.length > 0 ? (
            <Text variant="note" tone="muted">
              {list.questions.length === 1 ? '1 pregunta' : `${list.questions.length} preguntas`}
              {` · ${done} contestadas por los dos`}
            </Text>
          ) : null}
        </View>

        {list.isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <LoadingSymbol accessibilityLabel="Cargando las preguntas" />
          </View>
        ) : list.isError ? (
          <EmptyState
            art="circles"
            title="No pudimos abrir esta categoría"
            body="Tu celular está sin señal con el servidor. Revisa tu internet y vuelve a intentar."
            action={{ label: 'Reintentar', onPress: () => void list.refetch() }}
          />
        ) : list.questions.length === 0 ? (
          <EmptyState
            art="bubble"
            title="Aquí todavía no hay preguntas"
            body="Cuando se agreguen, van a aparecer aquí."
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {list.questions.map((q) => {
              const state = categoryRowState(q);
              const note =
                state === 'both'
                  ? 'Contestaron los dos.'
                  : state === 'mine'
                    ? `Contestaste. Falta ${partnerName}.`
                    : state === 'partner'
                      ? `${partnerName} contestó. Te toca.`
                      : null;
              return (
                <Card
                  key={q.id}
                  accessibilityLabel={note ? `${q.text}. ${note}` : q.text}
                  onPress={() => router.push({ pathname: '/question', params: { id: q.id } })}
                >
                  <Text variant="bodyStrong">{q.text}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text variant="note" tone="muted" style={{ flex: 1 }}>
                      {note ?? 'Sin contestar.'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                      <View style={{ opacity: q.answered_by_me ? 1 : 0.25 }}>
                        <FruitDot fruit={fruits.me} />
                      </View>
                      <View style={{ opacity: q.answered_by_partner ? 1 : 0.25 }}>
                        <FruitDot fruit={fruits.partner} />
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}

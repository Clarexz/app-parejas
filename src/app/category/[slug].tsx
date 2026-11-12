import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl, View } from 'react-native';

import { EmptyState, LoadingSymbol, Screen, ScreenHeader, Text } from '@/components';
import { useCouple } from '@/features/couple';
import { QuestionRow, useCategories, useCategoryQuestions } from '@/features/questions';
import { useTheme } from '@/theme';

export default function CategoryScreen() {
  const { spacing, fruit } = useTheme();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { partner } = useCouple();
  const { categories } = useCategories();
  const list = useCategoryQuestions(slug);
  const category = categories.find((c) => c.slug === slug);
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';
  const done = list.questions.filter((q) => q.answered_by_me && q.answered_by_partner).length;

  const header = (
    <View style={{ gap: spacing.xl, paddingBottom: spacing.xl }}>
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
          body="No pudimos conectarnos. Revisa tu internet y vuelve a intentar."
          action={{ label: 'Reintentar', onPress: () => void list.refetch() }}
        />
      ) : null}
    </View>
  );

  return (
    <Screen>
      <FlashList
        data={list.questions}
        keyExtractor={(q) => q.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          list.isLoading || list.isError ? null : (
            <EmptyState
              art="bubble"
              title="Aquí todavía no hay preguntas"
              body="Cuando se agreguen, van a aparecer aquí."
            />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListFooterComponent={<View style={{ height: spacing.xl }} />}
        renderItem={({ item: q }) => (
          <QuestionRow
            question={q}
            partnerName={partnerName}
            onPress={() => router.push({ pathname: '/question', params: { id: q.id } })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => void list.refetch()}
            tintColor={fruit.me.hex}
            colors={[fruit.me.hex]}
          />
        }
      />
    </Screen>
  );
}

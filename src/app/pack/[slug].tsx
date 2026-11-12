import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl, View } from 'react-native';

import { Button, EmptyState, LoadingSymbol, Screen, ScreenHeader, Text } from '@/components';
import { useCouple } from '@/features/couple';
import { PackProgress, QuestionRow, useCategoryQuestions, usePacks } from '@/features/questions';
import { packAction, packProgress, packProgressLine, packStatus } from '@/lib/packs';
import { PACK_FINISHED_LINE } from '@/lib/questionCopy';
import { spicyState } from '@/lib/questions';
import { useTheme } from '@/theme';

/** Un tema (pack): descripción, avance, "Empezar"/"Seguir" y la lista en el orden del tema. */
export default function PackScreen() {
  const { spacing, fruit } = useTheme();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { partner, members, me } = useCouple();
  const packs = usePacks();
  const list = useCategoryQuestions(slug);
  const pack = packs.packs.find((p) => p.slug === slug);
  const spicyActive = spicyState(members, me?.id ?? '').active;
  const status = pack ? packStatus(pack, spicyActive) : null;
  const action = status ? packAction(status) : null;
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';
  const refetchAll = () => {
    void packs.refetch();
    void list.refetch();
  };
  const loading = packs.isLoading || (status !== 'locked' && list.isLoading);
  const failed = packs.isError || (status !== 'locked' && list.isError);

  const header = (
    <View style={{ gap: spacing.xl, paddingBottom: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <ScreenHeader title={pack ? `${pack.emoji} ${pack.name}` : 'Tema'} back="Preguntas" />
        {pack ? (
          <Text variant="body" tone="muted">
            {pack.description}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
          <LoadingSymbol accessibilityLabel="Cargando el tema" />
        </View>
      ) : failed ? (
        <EmptyState
          art="circles"
          title="No pudimos abrir este tema"
          body="No pudimos conectarnos. Revisa tu internet y vuelve a intentar."
          action={{ label: 'Reintentar', onPress: refetchAll }}
        />
      ) : !pack ? (
        <EmptyState
          art="bubble"
          title="Ese tema ya no está"
          body="Regresa a Preguntas y elige otro."
          action={{ label: 'Volver', onPress: () => router.back() }}
        />
      ) : status === 'locked' ? (
        <EmptyState
          art="bubble"
          title="Todavía con candado"
          body="Las preguntas picantes se abren solo cuando los dos quieren. Cada quien lo decide en su celular."
          action={{ label: 'Ir al ajuste', onPress: () => router.push('/settings/couple') }}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          <PackProgress value={packProgress(pack)} />
          <Text variant="note" tone="muted">
            {packProgressLine(pack)}
          </Text>
          {action && pack.next_question_id ? (
            <Button
              title={action.label}
              fullWidth
              onPress={() =>
                router.push({
                  pathname: '/question',
                  params: { id: pack.next_question_id as string, pack: pack.slug },
                })
              }
            />
          ) : status === 'finished' ? (
            <Text variant="bodyStrong">{PACK_FINISHED_LINE}</Text>
          ) : null}
        </View>
      )}
    </View>
  );

  const showList = !!pack && status !== 'locked' && !loading && !failed;

  return (
    <Screen>
      <FlashList
        data={showList ? list.questions : []}
        keyExtractor={(q) => q.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          showList ? (
            <EmptyState
              art="bubble"
              title="Aquí todavía no hay preguntas"
              body="Cuando se agreguen, van a aparecer aquí."
            />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListFooterComponent={<View style={{ height: spacing.xl }} />}
        renderItem={({ item: q }) => (
          <QuestionRow
            question={q}
            partnerName={partnerName}
            onPress={() => router.push({ pathname: '/question', params: { id: q.id, pack: slug } })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={packs.isRefetching || list.isRefetching}
            onRefresh={refetchAll}
            tintColor={fruit.me.hex}
            colors={[fruit.me.hex]}
          />
        }
      />
    </Screen>
  );
}

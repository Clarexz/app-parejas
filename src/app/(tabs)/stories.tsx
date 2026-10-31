import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  CloudOff,
  Divider,
  EmptyState,
  Icon,
  ListRow,
  LoadingLines,
  PageHeader,
  Screen,
  Text,
} from '@/components';
import { useCouple, useToday } from '@/features/couple';
import { NewStorySheet, StoryPolaroid, groupActive, useActiveStories } from '@/features/stories';
import { storyAgo, storyTimeLeft } from '@/lib/stories';
import { formatStampIsoDate } from '@/lib/stampDate';
import { useTheme } from '@/theme';

export default function StoriesScreen() {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const { today } = useToday();
  const { me, partner } = useCouple();
  const { stories, isLoading, isError, refetch, isRefetching } = useActiveStories();
  const [sheetOpen, setSheetOpen] = useState(false);

  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';
  const now = new Date();
  const groups = useMemo(
    () => groupActive(stories, me?.id, partner?.id),
    [stories, me?.id, partner?.id],
  );
  const latest = groups.partner[groups.partner.length - 1] ?? null;

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <PageHeader stamp={formatStampIsoDate(today)} title="Stories" />
      <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
        {isLoading ? (
          <LoadingLines count={4} accessibilityLabel="Cargando las stories" />
        ) : isError ? (
          <EmptyState
            illustration={<CloudOff />}
            title="No pudimos abrir las stories"
            body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
            actionLabel="Reintentar"
            onAction={() => void refetch()}
          />
        ) : (
          <>
            <View style={{ gap: spacing.md }}>
              <Text variant="title" accessibilityRole="header">
                De {partnerName}
              </Text>
              {latest && partner ? (
                <View style={{ gap: spacing.md }}>
                  <View style={{ paddingTop: spacing.sm }}>
                    <StoryPolaroid
                      story={latest}
                      size="L"
                      tape="mint"
                      date={groups.partnerUnseen > 0 ? 'NUEVA' : undefined}
                      onPress={() =>
                        router.push({ pathname: '/story/view', params: { user: partner.id } })
                      }
                      accessibilityLabel={`Story de ${partnerName}${groups.partnerUnseen > 0 ? ', nueva' : ''}`}
                      accessibilityHint="Toca para verla"
                    />
                  </View>
                  <View style={{ gap: spacing.xs }}>
                    <Text variant="bodyStrong">
                      {`${partnerName} · ${storyAgo(latest.created_at, now)} · ${storyTimeLeft(latest.expires_at, now)}`}
                    </Text>
                    {groups.partner.length > 1 ? (
                      <Text variant="small" tone="muted">
                        {groups.partner.length} stories activas
                        {groups.partnerUnseen > 0 ? `, ${groups.partnerUnseen} sin ver` : ''}.
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <Text variant="hand" tone="muted">
                  {partnerName} no ha pegado nada hoy. Pégale tú una primero.
                </Text>
              )}
            </View>

            <Divider />

            <View style={{ gap: spacing.md }}>
              <Text variant="title" accessibilityRole="header">
                Las tuyas
              </Text>
              {groups.mine.length > 0 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing.lg,
                    paddingTop: spacing.sm,
                  }}
                >
                  {groups.mine.map((s) => {
                    const seenBy = s.views.some((v) => v.user_id === partner?.id);
                    return (
                      <View key={s.id} style={{ width: 104, gap: spacing.sm }}>
                        <StoryPolaroid
                          story={s}
                          size="S"
                          caption={storyAgo(s.created_at, now)}
                          onPress={() =>
                            router.push({ pathname: '/story/view', params: { story: s.id } })
                          }
                          accessibilityLabel={`Tu story de ${storyAgo(s.created_at, now)}`}
                          accessibilityHint="Toca para verla"
                        />
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: spacing.xs,
                            paddingTop: spacing.xs,
                          }}
                        >
                          <Icon
                            name="eye"
                            size={16}
                            color={seenBy ? colors.nopal : colors.inkMuted}
                          />
                          <Text
                            variant="caption"
                            tone={seenBy ? 'nopal' : 'muted'}
                            style={{ flexShrink: 1 }}
                          >
                            {seenBy ? 'Visto' : 'Sin ver'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text variant="hand" tone="muted">
                  Todavía no pegas nada hoy.
                </Text>
              )}
              <View style={{ alignItems: 'flex-start', marginTop: spacing.sm }}>
                <Button title="Pegar una story" onPress={() => setSheetOpen(true)} />
              </View>
            </View>

            <ListRow
              label="Mi archivo"
              icon="archive"
              onPress={() => router.push('/story/archive')}
              divider={false}
            />
          </>
        )}
      </View>
      <NewStorySheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}

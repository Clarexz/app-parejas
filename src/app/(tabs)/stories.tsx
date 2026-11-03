import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import {
  Button,
  EmptyState,
  FruitDot,
  ListGroup,
  ListRow,
  LoadingSymbol,
  Notice,
  Screen,
  ScreenHeader,
  Text,
} from '@/components';
import { useCouple } from '@/features/couple';
import { useSignedUrl } from '@/features/profile';
import {
  NewStorySheet,
  StoriesRowView,
  StoryThumb,
  groupActive,
  useActiveStories,
} from '@/features/stories';
import { storyAgo } from '@/lib/stories';
import { useTheme } from '@/theme';

export default function StoriesScreen() {
  const { spacing, page, fruit } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { me, partner } = useCouple();
  const { stories, isLoading, isError, refetch, isRefetching } = useActiveStories();
  const [sheetOpen, setSheetOpen] = useState(false);
  const myAvatar = useSignedUrl(me?.avatar_path);
  const partnerAvatar = useSignedUrl(partner?.avatar_path);

  const myName = me?.nickname || me?.display_name || 'Tú';
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';
  const now = new Date();
  const groups = useMemo(
    () => groupActive(stories, me?.id, partner?.id),
    [stories, me?.id, partner?.id],
  );

  const gap = spacing.md;
  const thumbW = Math.floor((Math.min(width, 520) - page.gutter * 2 - gap * 2) / 3);

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <ScreenHeader title="Stories" />
      <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl }}>
            <LoadingSymbol />
          </View>
        ) : isError ? (
          <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
            No pudimos abrir las stories. Tu celular está sin señal; revisa tu internet y vuelve a
            intentar.
          </Notice>
        ) : (
          <>
            <StoriesRowView
              myName={myName}
              myAvatar={myAvatar}
              partnerName={partnerName}
              partnerAvatar={partnerAvatar}
              mineCount={groups.mine.length}
              partnerCount={groups.partner.length}
              partnerUnseen={groups.partnerUnseen}
              hasPartner={!!partner}
              onPressMine={() => setSheetOpen(true)}
              onPressPartner={() =>
                partner && router.push({ pathname: '/story/view', params: { user: partner.id } })
              }
            />

            <View style={{ gap: spacing.md }}>
              <Text variant="h3" accessibilityRole="header">
                Las tuyas de hoy
              </Text>
              {groups.mine.length > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, rowGap: spacing.lg }}>
                    {groups.mine.map((s) => {
                      const seenBy = s.views.some((v) => v.user_id === partner?.id);
                      return (
                        <View key={s.id} style={{ width: thumbW, gap: spacing.sm }}>
                          <StoryThumb
                            story={s}
                            width={thumbW}
                            fruit={fruit.me}
                            onPress={() =>
                              router.push({ pathname: '/story/view', params: { story: s.id } })
                            }
                            accessibilityLabel={`Tu story de ${storyAgo(s.created_at, now)}`}
                            accessibilityHint="Toca para verla"
                          />
                          <View
                            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                          >
                            {seenBy && fruit.partner ? <FruitDot fruit={fruit.partner} /> : null}
                            <Text variant="note" tone="muted" style={{ flexShrink: 1 }}>
                              {seenBy ? 'Vista' : 'Sin ver'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  <View style={{ marginTop: spacing.sm }}>
                    <Button
                      title="Crear una story"
                      icon="plus"
                      onPress={() => setSheetOpen(true)}
                      fullWidth
                    />
                  </View>
                </>
              ) : (
                <EmptyState
                  art="circles"
                  title="Nada por aquí"
                  body={`${partnerName} se está preguntando qué traes. Sube una foto, escribe algo o dibuja cualquier cosa.`}
                  action={{ label: 'Crear una story', onPress: () => setSheetOpen(true) }}
                />
              )}
            </View>

            <ListGroup>
              <ListRow
                label="Mi archivo"
                icon="archive"
                onPress={() => router.push('/story/archive')}
              />
            </ListGroup>
          </>
        )}
      </View>
      <NewStorySheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}

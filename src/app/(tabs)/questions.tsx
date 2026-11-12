import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Card, EmptyState, Icon, LoadingSymbol, Screen, Sheet, Text } from '@/components';
import { useCouple } from '@/features/couple';
import { GamesSection, useGameOverview } from '@/features/games';
import {
  DailyQuestionCard,
  PackProgress,
  useCategories,
  usePacks,
  useStreak,
} from '@/features/questions';
import { ShareCardButton } from '@/features/share';
import { StreakChip } from '@/features/questions/components/StreakChip';
import { packProgress, packStatus } from '@/lib/packs';
import {
  REPAIR_TODAY_NOTE,
  packCardNote,
  packCompactNote,
  repairPrompt,
  repairView,
  repairsLeftLine,
} from '@/lib/questionCopy';
import { spicyState } from '@/lib/questions';
import { streakHeadline } from '@/lib/questionsView';
import { page, useTheme } from '@/theme';

export default function QuestionsScreen() {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const { members, me } = useCouple();
  const streak = useStreak();
  const categories = useCategories();
  const packs = usePacks();
  const games = useGameOverview();
  const [spicySheet, setSpicySheet] = useState(false);

  const spicyActive = spicyState(members, me?.id ?? '').active;
  const refetchAll = () => {
    void streak.refetch();
    void categories.refetch();
    void packs.refetch();
    void games.refetch();
  };
  const loading = streak.isLoading || categories.isLoading;
  const failed = streak.isError || categories.isError;
  const repair = streak.streak ? repairView(streak.streak) : { kind: 'none' as const };

  return (
    <Screen
      scroll
      refreshing={
        streak.isRefetching || categories.isRefetching || packs.isRefetching || games.isRefetching
      }
      onRefresh={refetchAll}
    >
      <View style={{ gap: spacing.xxl }}>
        <View style={{ gap: spacing.xl }}>
          <Text variant="h1" accessibilityRole="header">
            Preguntas
          </Text>
          <DailyQuestionCard />

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <LoadingSymbol accessibilityLabel="Cargando las preguntas" />
            </View>
          ) : failed ? (
            <EmptyState
              art="circles"
              title="No pudimos abrir las preguntas"
              body="No pudimos conectarnos. Revisa tu internet y vuelve a intentar."
              action={{ label: 'Reintentar', onPress: refetchAll }}
            />
          ) : (
            <>
              {streak.streak ? (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="label" tone="muted">
                    Su racha
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    {streak.streak.current > 0 ? <StreakChip days={streak.streak.current} /> : null}
                    <Text variant="note" tone="muted" style={{ flex: 1 }}>
                      {streak.streak.current > 0
                        ? `Récord: ${streak.streak.best} ${streak.streak.best === 1 ? 'día' : 'días'}`
                        : streakHeadline(0)}
                    </Text>
                    {streak.streak.current > 0 ? (
                      <ShareCardButton data={{ kind: 'streak', days: streak.streak.current }} />
                    ) : null}
                  </View>
                </View>
              ) : null}

              {repair.kind === 'repair' ? (
                <Card tone="me" accessibilityLabel="Recuperar ayer">
                  <View style={{ gap: spacing.md }}>
                    <Text variant="body">{repairPrompt(repair.current)}</Text>
                    <Button
                      title="Recuperar ayer"
                      onPress={() =>
                        router.push({ pathname: '/question', params: { day: repair.day } })
                      }
                    />
                    <Text variant="note" tone="muted">
                      {repairsLeftLine(repair.left, repair.perMonth)}
                    </Text>
                  </View>
                </Card>
              ) : repair.kind === 'repaired_today' ? (
                <Text variant="note" tone="muted">
                  {REPAIR_TODAY_NOTE}
                </Text>
              ) : null}

              <View style={{ gap: spacing.md }}>
                <Text variant="h3" accessibilityRole="header">
                  Categorías
                </Text>
                {categories.categories.length === 0 ? (
                  <Text variant="body" tone="muted">
                    Todavía no hay categorías. Jala hacia abajo para actualizar.
                  </Text>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      rowGap: spacing.md,
                    }}
                  >
                    {categories.categories.map((c) => {
                      const locked = c.intensity === 'picante' && !spicyActive;
                      return (
                        <View key={c.slug} style={{ width: '48.5%' }}>
                          <Card
                            accessibilityLabel={
                              locked ? `${c.name}, bloqueada` : `${c.name}. ${c.description}`
                            }
                            onPress={() =>
                              locked
                                ? setSpicySheet(true)
                                : router.push({
                                    pathname: '/category/[slug]',
                                    params: { slug: c.slug },
                                  })
                            }
                            style={{ padding: spacing.md, minHeight: 64, justifyContent: 'center' }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: spacing.sm,
                              }}
                            >
                              <Text variant="h3" accessibilityElementsHidden>
                                {c.emoji}
                              </Text>
                              <Text variant="ui" style={{ flex: 1 }} numberOfLines={2}>
                                {c.name}
                              </Text>
                              {locked ? (
                                <Icon name="lock" size={18} color={colors.inkMuted} />
                              ) : null}
                            </View>
                          </Card>
                        </View>
                      );
                    })}
                  </View>
                )}
                <View style={{ alignItems: 'flex-start' }}>
                  <Button
                    title="Agregar una pregunta"
                    variant="secondary"
                    icon="plus"
                    onPress={() => router.push('/add-question')}
                  />
                </View>
              </View>

              <View style={{ gap: spacing.md }}>
                <Text variant="h3" accessibilityRole="header">
                  Temas
                </Text>
                {packs.isLoading ? (
                  <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                    <LoadingSymbol size={32} accessibilityLabel="Cargando los temas" />
                  </View>
                ) : packs.isError ? (
                  <Text variant="body" tone="muted">
                    No pudimos cargar los temas. Jala hacia abajo para intentar otra vez.
                  </Text>
                ) : packs.packs.length === 0 ? (
                  <Text variant="body" tone="muted">
                    Todavía no hay temas. Jala hacia abajo para actualizar.
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginHorizontal: -page.gutter }}
                    contentContainerStyle={{ paddingHorizontal: page.gutter, gap: spacing.md }}
                  >
                    {packs.packs.map((p) => {
                      const status = packStatus(p, spicyActive);
                      const locked = status === 'locked';
                      const note = packCardNote(status, p);
                      return (
                        <View key={p.slug} style={{ width: 168 }}>
                          <Card
                            accessibilityLabel={
                              locked
                                ? `${p.name}, bloqueado`
                                : `${p.name}. ${p.description}. ${note}`
                            }
                            onPress={() =>
                              locked
                                ? setSpicySheet(true)
                                : router.push({
                                    pathname: '/pack/[slug]',
                                    params: { slug: p.slug },
                                  })
                            }
                            style={{ padding: spacing.md, gap: spacing.sm, minHeight: 132 }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Text variant="h2" accessibilityElementsHidden>
                                {p.emoji}
                              </Text>
                              {locked ? (
                                <Icon name="lock" size={18} color={colors.inkMuted} />
                              ) : null}
                            </View>
                            <Text variant="ui" numberOfLines={2} style={{ flex: 1 }}>
                              {p.name}
                            </Text>
                            {locked || status === 'empty' ? null : (
                              <PackProgress value={packProgress(p)} />
                            )}
                            <Text variant="note" tone="muted">
                              {packCompactNote(status, p)}
                            </Text>
                          </Card>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </>
          )}
        </View>

        <View style={{ gap: spacing.xl }}>
          <Text variant="h1" accessibilityRole="header">
            Juegos
          </Text>
          <GamesSection />
        </View>
      </View>

      <Sheet visible={spicySheet} onClose={() => setSpicySheet(false)} title="Todavía con candado">
        <View style={{ gap: spacing.md }}>
          <Text variant="body">
            Las preguntas picantes se abren solo cuando los dos quieren. Cada quien lo decide en su
            celular y cualquiera puede apagarlas después.
          </Text>
          <Button
            title="Ir al ajuste"
            fullWidth
            onPress={() => {
              setSpicySheet(false);
              router.push('/settings/couple');
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

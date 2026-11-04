import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, EmptyState, Icon, LoadingSymbol, Screen, Sheet, Text } from '@/components';
import { useCouple } from '@/features/couple';
import { GamesSection, useGameOverview } from '@/features/games';
import { DailyQuestionCard, useCategories, useStreak } from '@/features/questions';
import { StreakChip } from '@/features/questions/components/StreakChip';
import { REPAIR_TODAY_NOTE, repairPrompt, repairView, repairsLeftLine } from '@/lib/questionCopy';
import { spicyState } from '@/lib/questions';
import { streakHeadline } from '@/lib/questionsView';
import { useTheme } from '@/theme';

export default function QuestionsScreen() {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const { members, me } = useCouple();
  const streak = useStreak();
  const categories = useCategories();
  const games = useGameOverview();
  const [spicySheet, setSpicySheet] = useState(false);

  const spicyActive = spicyState(members, me?.id ?? '').active;
  const refetchAll = () => {
    void streak.refetch();
    void categories.refetch();
    void games.refetch();
  };
  const loading = streak.isLoading || categories.isLoading;
  const failed = streak.isError || categories.isError;
  const repair = streak.streak ? repairView(streak.streak) : { kind: 'none' as const };

  return (
    <Screen
      scroll
      refreshing={streak.isRefetching || categories.isRefetching || games.isRefetching}
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
                  categories.categories.map((c) => {
                    const locked = c.intensity === 'picante' && !spicyActive;
                    return (
                      <Card
                        key={c.slug}
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
                      >
                        <View
                          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
                        >
                          <Text variant="h2" accessibilityElementsHidden>
                            {c.emoji}
                          </Text>
                          <View style={{ flex: 1, gap: spacing.xxs }}>
                            <Text variant="h3">{c.name}</Text>
                            <Text variant="note" tone="muted">
                              {locked ? 'Se abre cuando los dos quieran.' : c.description}
                            </Text>
                          </View>
                          <Icon
                            name={locked ? 'lock' : 'chevron'}
                            size={22}
                            color={colors.inkMuted}
                          />
                        </View>
                      </Card>
                    );
                  })
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

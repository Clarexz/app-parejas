import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  ListRow,
  LoadingSymbol,
  Screen,
  ScreenHeader,
  Sheet,
  Text,
  useToast,
  type IconName,
} from '@/components';
import { shortDay } from '@/features/questions/groupByMonth';
import { useToday } from '@/features/couple';
import { todayIn } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import {
  DRAWING_INFO,
  GAMES,
  GAME_IDS,
  drawingTurn,
  roundTurn,
  type DrawingSummary,
  type GameId,
  type GameStats,
} from '@/lib/games';
import { haptic } from '@/lib/haptics';
import { spicyState } from '@/lib/questions';
import { useTheme } from '@/theme';

import { useGameOverview, useStartDrawing, useStartGameRound } from '../hooks';
import { useNames } from './useNames';

type Target = GameId | 'drawing';

const GAME_ICONS: Record<GameId, IconName> = {
  wyr: 'ask',
  nhie: 'smile',
  most_likely: 'couple',
  agree: 'check',
};

function gameStatus(stats: GameStats | undefined, partnerName: string) {
  const open = stats?.open_round;
  if (open) {
    return {
      text: `Ronda en curso · tú ${open.my_count}/${open.total} · ${partnerName} ${open.partner_count}/${open.total}`,
      mine: open.my_count < open.total,
    };
  }
  if (!stats || stats.finished_count === 0) {
    return { text: 'Todavía no han jugado este.', mine: false };
  }
  const rounds = stats.finished_count === 1 ? '1 ronda' : `${stats.finished_count} rondas`;
  const avg = stats.avg_pct != null ? ` · coinciden ${stats.avg_pct}% en promedio` : '';
  const last = stats.last_pct != null ? ` · la última ${stats.last_pct}%` : '';
  return { text: `${rounds}${avg}${last}`, mine: false };
}

function drawingLine(d: DrawingSummary, meId: string, partnerName: string): string {
  switch (drawingTurn(d, meId)) {
    case 'drawing':
      return 'Te toca dibujar.';
    case 'my_guess':
      return `${partnerName} te dibujó algo. A adivinar.`;
    case 'waiting_guess':
      return `${partnerName} está adivinando tu dibujo.`;
    case 'waiting_drawing':
      return `${partnerName} está dibujando.`;
    default:
      return 'Terminado.';
  }
}

/** Ícono del juego en un círculo `surface2`, para ubicarlos de un vistazo. */
function GameBadge({ icon }: { icon: IconName }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={24} />
    </View>
  );
}

/** Hub "Juegos": lo que te toca, los juegos como tarjetas y las últimas rondas (DISENO §8). */
export function GamesHub() {
  const { spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { today, timeZone } = useToday();
  const { meId, partnerName, members } = useNames();
  const { overview, isLoading, isError, refetch, isRefetching } = useGameOverview();
  const startRound = useStartGameRound();
  const startDrawing = useStartDrawing();
  const [target, setTarget] = useState<Target | null>(null);
  const [open, setOpen] = useState(false);

  const spicyActive = spicyState(members, meId).active;
  const statsOf = (g: GameId) => overview?.games.find((s) => s.game === g);

  const openGame = (g: GameId) => {
    const round = statsOf(g)?.open_round;
    if (round) {
      router.push({ pathname: '/game/[id]', params: { id: round.id } });
      return;
    }
    setTarget(g);
    setOpen(true);
  };

  const play = (game: GameId, spicy: boolean) => {
    startRound.mutate(
      { game, spicy },
      {
        onSuccess: (round) => {
          haptic.light();
          setOpen(false);
          router.push({ pathname: '/game/[id]', params: { id: round.id } });
        },
        onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }),
      },
    );
  };

  const draw = () => {
    startDrawing.mutate(undefined, {
      onSuccess: (d) => {
        haptic.light();
        setOpen(false);
        router.push({ pathname: '/drawing/[id]', params: { id: d.id } });
      },
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }),
    });
  };

  const openDrawing = (id: string) => router.push({ pathname: '/drawing/[id]', params: { id } });

  const myTurnRounds = (overview?.games ?? []).filter(
    (g) =>
      g.open_round &&
      roundTurn({
        status: 'playing',
        my_count: g.open_round.my_count,
        total: g.open_round.total,
      }) === 'my_turn',
  );
  const myTurnDrawings = (overview?.drawings.active ?? []).filter((d) => {
    const t = drawingTurn(d, meId);
    return t === 'my_guess' || t === 'drawing';
  });
  const otherDrawings = (overview?.drawings.active ?? []).filter(
    (d) => !myTurnDrawings.includes(d),
  );
  const hasTurn = myTurnRounds.length + myTurnDrawings.length > 0;

  const header = <ScreenHeader title="Juegos" back="Atrás" />;

  if (isLoading) {
    return (
      <Screen scroll>
        {header}
        <View style={{ alignItems: 'center', marginTop: spacing.xxxl }}>
          <LoadingSymbol accessibilityLabel="Cargando los juegos" />
        </View>
      </Screen>
    );
  }
  if (isError || !overview) {
    return (
      <Screen scroll>
        {header}
        <EmptyState
          art="circles"
          title="No pudimos abrir los juegos"
          body="Tu celular está sin señal con el servidor. Revisa tu internet y vuelve a intentar."
          action={{ label: 'Reintentar', onPress: () => void refetch() }}
        />
      </Screen>
    );
  }

  const info = target && target !== 'drawing' ? GAMES[target] : null;
  const sheetTitle = target === 'drawing' ? DRAWING_INFO.name : (info?.name ?? '');
  const sheetHow = target === 'drawing' ? DRAWING_INFO.howTo : (info?.howTo ?? '');
  const everPlayed =
    overview.games.some((g) => g.finished_count > 0 || g.open_round) ||
    overview.recent.length > 0 ||
    overview.drawings.recent.length > 0 ||
    overview.drawings.active.length > 0;

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      {header}
      <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
        {hasTurn ? (
          <View style={{ gap: spacing.md }}>
            <Text variant="h3" accessibilityRole="header">
              Te toca
            </Text>
            {myTurnRounds.map((g) => (
              <Card
                key={`turn-${g.game}`}
                tone="me"
                onPress={() => openGame(g.game)}
                accessibilityLabel={`Te toca en ${GAMES[g.game].name}`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <GameBadge icon={GAME_ICONS[g.game]} />
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <Text variant="h3">{GAMES[g.game].name}</Text>
                    <Text variant="note" tone="muted">
                      {gameStatus(g, partnerName).text}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
            {myTurnDrawings.map((d) => (
              <Card
                key={`turn-${d.id}`}
                tone="me"
                onPress={() => openDrawing(d.id)}
                accessibilityLabel={`Te toca en ${DRAWING_INFO.name}`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <GameBadge icon="pencil" />
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <Text variant="h3">{DRAWING_INFO.name}</Text>
                    <Text variant="note" tone="muted">
                      {drawingLine(d, meId, partnerName)}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {!everPlayed ? (
          <Text variant="body" tone="muted">
            Cinco juegos para conocerse jugando. Nadie lleva puntos, pero sí hay chisme.
          </Text>
        ) : null}

        <View style={{ gap: spacing.md }}>
          <Text variant="h3" accessibilityRole="header">
            Para jugar
          </Text>
          {GAME_IDS.map((g) => {
            const status = gameStatus(statsOf(g), partnerName);
            const spicyRound = statsOf(g)?.open_round?.spicy;
            return (
              <Card
                key={g}
                onPress={() => openGame(g)}
                accessibilityLabel={`${GAMES[g].name}. ${status.text}`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <GameBadge icon={GAME_ICONS[g]} />
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <Text variant="h3">{GAMES[g].name}</Text>
                    <Text variant="body" tone="muted">
                      {GAMES[g].tagline}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                  }}
                >
                  {spicyRound ? <Chip label="Picante" /> : null}
                  <Text variant="note" tone="muted" style={{ flexShrink: 1 }}>
                    {status.text}
                  </Text>
                </View>
              </Card>
            );
          })}

          <Card
            onPress={() => {
              setTarget('drawing');
              setOpen(true);
            }}
            accessibilityLabel={`${DRAWING_INFO.name}. Dibujar`}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <GameBadge icon="pencil" />
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <Text variant="h3">{DRAWING_INFO.name}</Text>
                <Text variant="body" tone="muted">
                  {DRAWING_INFO.tagline}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {otherDrawings.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="h3" accessibilityRole="header">
              Retos de dibujo
            </Text>
            <View>
              {otherDrawings.map((d, i) => (
                <ListRow
                  key={d.id}
                  label={drawingLine(d, meId, partnerName)}
                  icon="pencil"
                  onPress={() => openDrawing(d.id)}
                  divider={i < otherDrawings.length - 1}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Text variant="h3" accessibilityRole="header">
            Últimas rondas
          </Text>
          {overview.recent.length === 0 ? (
            <EmptyState
              art="spark"
              title="Todavía no hay rondas terminadas"
              body="Cuando las dos terminen una ronda, aquí queda cuánto coincidieron. Sin presión, pero con ganas."
            />
          ) : (
            overview.recent.map((r) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={`${GAMES[r.game].name}, ${r.pct}% de coincidencia`}
                onPress={() => router.push({ pathname: '/game/[id]', params: { id: r.id } })}
                style={({ pressed }) => ({
                  minHeight: 56,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.sm,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flex: 1, gap: spacing.xxs }}>
                  <Text variant="bodyStrong">
                    {GAMES[r.game].name}
                    {r.spicy ? ' · picante' : ''}
                  </Text>
                  <Text variant="note" tone="muted">
                    {shortDay(todayIn(timeZone, new Date(r.finished_at)) || today)}
                  </Text>
                </View>
                <Text variant="num">{r.pct}%</Text>
              </Pressable>
            ))
          )}
        </View>
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title={sheetTitle}>
        <View style={{ gap: spacing.md }}>
          <Text variant="body">{sheetHow}</Text>
          {target === 'drawing' ? (
            <Button
              title="Dibujar"
              fullWidth
              onPress={draw}
              loading={startDrawing.isPending}
              disabled={startDrawing.isPending}
            />
          ) : target ? (
            <>
              <Button
                title="Jugar"
                fullWidth
                onPress={() => play(target, false)}
                loading={startRound.isPending && startRound.variables?.spicy === false}
                disabled={startRound.isPending}
              />
              {spicyActive ? (
                <Button
                  title="Versión picante"
                  variant="secondary"
                  fullWidth
                  onPress={() => play(target, true)}
                  disabled={startRound.isPending}
                />
              ) : (
                <View style={{ gap: spacing.xs, alignItems: 'flex-start' }}>
                  <Text variant="note" tone="muted">
                    La versión picante se abre cuando los dos activan picantes.
                  </Text>
                  <Button
                    title="Ir al ajuste"
                    variant="ghost"
                    onPress={() => {
                      setOpen(false);
                      router.push('/settings/couple');
                    }}
                  />
                </View>
              )}
            </>
          ) : null}
        </View>
      </Sheet>
    </Screen>
  );
}

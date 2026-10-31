import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  CloudOff,
  Divider,
  EmptyState,
  IconButton,
  LoadingLines,
  PageHeader,
  PencilNote,
  Screen,
  Sheet,
  Stamp,
  Tape,
  Text,
  useToast,
} from '@/components';
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
import { shortStamp } from '@/lib/questionsView';
import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

import { useGameOverview, useStartDrawing, useStartGameRound } from '../hooks';
import { useNames } from './useNames';

type Target = GameId | 'drawing';

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

/** Hub "Juegos": lo que te toca, los 5 juegos como fichas y las últimas rondas (DISENO §8). */
export function GamesHub() {
  const { spacing, colors } = useTheme();
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
          haptic.stick();
          setOpen(false);
          router.push({ pathname: '/game/[id]', params: { id: round.id } });
        },
        onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
      },
    );
  };

  const draw = () => {
    startDrawing.mutate(undefined, {
      onSuccess: (d) => {
        haptic.stick();
        setOpen(false);
        router.push({ pathname: '/drawing/[id]', params: { id: d.id } });
      },
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
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

  const header = (
    <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
      <View style={{ marginLeft: -spacing.sm }}>
        <IconButton name="back" accessibilityLabel="Volver" onPress={() => router.back()} />
      </View>
      <PageHeader stamp="A JUGAR" title="Juegos" />
    </View>
  );

  if (isLoading) {
    return (
      <Screen scroll>
        {header}
        <View style={{ marginTop: spacing.xl }}>
          <LoadingLines count={5} accessibilityLabel="Cargando los juegos" />
        </View>
      </Screen>
    );
  }
  if (isError || !overview) {
    return (
      <Screen scroll>
        {header}
        <EmptyState
          illustration={<CloudOff />}
          title="No pudimos abrir los juegos"
          body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
          actionLabel="Reintentar"
          onAction={() => void refetch()}
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
            <Text variant="title" accessibilityRole="header">
              Te toca
            </Text>
            {myTurnRounds.map((g) => (
              <Card
                key={`turn-${g.game}`}
                tilt={tiltFor(`turn-${g.game}`, 1)}
                onPress={() => openGame(g.game)}
                accessibilityLabel={`Te toca en ${GAMES[g.game].name}`}
              >
                <Stamp>TE TOCA</Stamp>
                <Text variant="hand">{GAMES[g.game].name}</Text>
                <Text variant="small" muted>
                  {gameStatus(g, partnerName).text}
                </Text>
              </Card>
            ))}
            {myTurnDrawings.map((d) => (
              <Card
                key={`turn-${d.id}`}
                tilt={tiltFor(`turn-${d.id}`, 1)}
                onPress={() => openDrawing(d.id)}
                accessibilityLabel={`Te toca en ${DRAWING_INFO.name}`}
              >
                <Stamp>TE TOCA</Stamp>
                <Text variant="hand">{DRAWING_INFO.name}</Text>
                <Text variant="small" muted>
                  {drawingLine(d, meId, partnerName)}
                </Text>
              </Card>
            ))}
          </View>
        ) : null}

        {!everPlayed ? (
          <Text variant="body" muted>
            Cinco juegos para conocerse jugando. Nadie lleva puntos, pero sí hay chisme.
          </Text>
        ) : null}

        <View style={{ gap: spacing.lg }}>
          {GAME_IDS.map((g, i) => {
            const tape = i === 0 ? 'yellow' : i === 2 ? 'mint' : null;
            const status = gameStatus(statsOf(g), partnerName);
            const spicyRound = statsOf(g)?.open_round?.spicy;
            return (
              <Card
                key={g}
                tilt={i % 2 === 0 ? -1.5 : 1.5}
                onPress={() => openGame(g)}
                accessibilityLabel={`${GAMES[g].name}. ${status.text}`}
              >
                {tape ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: -8,
                      ...(i === 0 ? { right: spacing.lg } : { left: spacing.lg }),
                    }}
                  >
                    <Tape color={tape} rotate={i === 0 ? 4 : -3} />
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                  <Chip label={GAMES[g].name} color={i % 2 === 0 ? 'yellow' : 'mint'} />
                  {spicyRound ? <Chip label="Picante" color="pink" /> : null}
                </View>
                <Text variant="body">{GAMES[g].tagline}</Text>
                <Text variant="small" tone={status.mine ? 'jamaica' : 'muted'}>
                  {status.text}
                </Text>
              </Card>
            );
          })}

          <Card
            tilt={-1.5}
            onPress={() => {
              setTarget('drawing');
              setOpen(true);
            }}
            accessibilityLabel={`${DRAWING_INFO.name}. Dibujar`}
          >
            <View pointerEvents="none" style={{ position: 'absolute', top: -8, right: spacing.lg }}>
              <Tape color="pink" rotate={3} />
            </View>
            <Chip label={DRAWING_INFO.name} color="pink" />
            <Text variant="body">{DRAWING_INFO.tagline}</Text>
            <Text variant="hand" tone="jamaica">
              Dibujar
            </Text>
          </Card>
        </View>

        {otherDrawings.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="title" accessibilityRole="header">
              Retos de dibujo
            </Text>
            {otherDrawings.map((d, i) => (
              <View key={d.id}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={drawingLine(d, meId, partnerName)}
                  onPress={() => openDrawing(d.id)}
                  style={({ pressed }) => ({
                    minHeight: 48,
                    justifyContent: 'center',
                    paddingVertical: spacing.sm,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text variant="body">{drawingLine(d, meId, partnerName)}</Text>
                </Pressable>
                {i < otherDrawings.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Text variant="title" accessibilityRole="header">
            Últimas rondas
          </Text>
          {overview.recent.length === 0 ? (
            <EmptyState
              illustration={<PencilNote />}
              title="Todavía no hay rondas terminadas"
              body="Cuando las dos partes terminen una ronda, aquí queda anotado cuánto coincidieron. Sin presión, pero con ganas."
            />
          ) : (
            overview.recent.map((r, i) => (
              <View key={r.id}>
                <Pressable
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
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text variant="bodyStrong">
                      {GAMES[r.game].name}
                      {r.spicy ? ' · picante' : ''}
                    </Text>
                    <Stamp tone="ink">
                      {shortStamp(todayIn(timeZone, new Date(r.finished_at)) || today)}
                    </Stamp>
                  </View>
                  <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
                    {r.pct}%
                  </Text>
                </Pressable>
                {i < overview.recent.length - 1 ? <Divider /> : null}
              </View>
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
              onPress={draw}
              loading={startDrawing.isPending}
              disabled={startDrawing.isPending}
            />
          ) : target ? (
            <>
              <Button
                title="Jugar"
                onPress={() => play(target, false)}
                loading={startRound.isPending && startRound.variables?.spicy === false}
                disabled={startRound.isPending}
              />
              {spicyActive ? (
                <View style={{ gap: spacing.xs }}>
                  <Chip
                    label="Versión picante"
                    color="pink"
                    onPress={() => play(target, true)}
                    disabled={startRound.isPending}
                  />
                </View>
              ) : (
                <View style={{ gap: spacing.xs }}>
                  <Text variant="caption" muted>
                    La versión picante se abre cuando los dos activan picantes.
                  </Text>
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => {
                      setOpen(false);
                      router.push('/settings/couple');
                    }}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text
                      variant="small"
                      tone="jamaica"
                      style={{
                        textDecorationLine: 'underline',
                        textDecorationColor: colors.jamaica,
                      }}
                    >
                      Ir al ajuste
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : null}
        </View>
      </Sheet>
    </Screen>
  );
}

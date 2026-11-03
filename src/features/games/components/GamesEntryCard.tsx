import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, Icon, Text } from '@/components';
import { GAMES, drawingTurn, roundTurn, type GameOverview } from '@/lib/games';
import { useTheme } from '@/theme';

import { useGameOverview } from '../hooks';
import { useNames } from './useNames';

const GAMES_IDLE = '5 juegos para conocerse jugando';

/** Resumen de una línea para la entrada de Juegos. */
export function gamesSummary(
  overview: GameOverview | null,
  meId: string,
  partnerName = 'Tu pareja',
): string {
  if (overview) {
    const round = overview.games.find(
      (g) =>
        g.open_round &&
        roundTurn({
          status: 'playing',
          my_count: g.open_round.my_count,
          total: g.open_round.total,
        }) === 'my_turn',
    );
    if (round) return `Te toca en ${GAMES[round.game].name}`;
    const drawing = overview.drawings.active.find((d) => {
      const t = drawingTurn(d, meId);
      return t === 'my_guess' || t === 'drawing';
    });
    if (drawing) {
      return drawingTurn(drawing, meId) === 'my_guess'
        ? `${partnerName} te dejó un dibujo`
        : 'Te toca dibujar';
    }
  }
  return GAMES_IDLE;
}

/** Entrada a Juegos: abre `/games` aunque el resumen no cargue. */
export function GamesEntryCard() {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const { meId, partnerName } = useNames();
  const { overview } = useGameOverview();
  const summary = gamesSummary(overview, meId, partnerName);
  const pending = summary !== GAMES_IDLE;
  return (
    <Card
      tone={pending ? 'me' : 'surface'}
      onPress={() => router.push('/games')}
      accessibilityLabel={`Juegos. ${summary}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Icon name="games" size={28} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="h3">Juegos</Text>
          <Text variant="note" tone="muted">
            {summary}
          </Text>
        </View>
        <Icon name="chevron" size={22} color={colors.inkMuted} />
      </View>
    </Card>
  );
}

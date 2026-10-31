import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, Icon, Text } from '@/components';
import { GAMES, drawingTurn, roundTurn, type GameOverview } from '@/lib/games';
import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

import { useGameOverview } from '../hooks';
import { useNames } from './useNames';

const GAMES_IDLE = '5 juegos para conocerse jugando';

/** Resumen de una línea para la ficha de la pestaña Preguntas. */
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

/** Ficha "Juegos" de la pestaña Preguntas: abre `/games` aunque el resumen no cargue. */
export function GamesEntryCard() {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const { meId, partnerName } = useNames();
  const { overview } = useGameOverview();
  const summary = gamesSummary(overview, meId, partnerName);
  const pending = summary !== GAMES_IDLE;
  return (
    <Card
      tilt={tiltFor('games-entry', 1)}
      onPress={() => router.push('/games')}
      accessibilityLabel={`Juegos. ${summary}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="hand" tone={pending ? 'jamaica' : 'ink'}>
            {summary}
          </Text>
          <Text variant="small" muted>
            ¿Qué prefieres?, Yo nunca, dibujo y más
          </Text>
        </View>
        <View style={{ transform: [{ rotate: '180deg' }] }}>
          <Icon name="back" size={20} color={colors.inkMuted} />
        </View>
      </View>
    </Card>
  );
}

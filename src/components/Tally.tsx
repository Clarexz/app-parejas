import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

import { Text } from './Text';

type Props = {
  /** Cuántos palitos hay en total (se agrupan de 5 en 5). */
  total: number;
  /** Cuántos ya están marcados con tinta; el resto queda en lápiz tenue. */
  count: number;
  /** Texto para lectores de pantalla, p. ej. "3 de 10". */
  accessibilityLabel?: string;
  /** `strike` pinta los marcados en Chile (intentos gastados). */
  tone?: 'ink' | 'chile';
};

const MARK_GAP = 7;
const GROUP_W = MARK_GAP * 4 + 12;
const H = 24;

/** Palitos de un conteo: una marca vertical con ligero temblor (determinista por índice). */
function markPath(i: number): string {
  const x = 4 + (i % 5) * MARK_GAP;
  const wobble = ((i * 7) % 3) - 1; // −1, 0, 1: siempre igual para el mismo palito
  return `M${x + wobble * 0.4} 3 C${x - 0.6} 9 ${x + 0.8} 15 ${x + wobble * 0.6} 21`;
}

/** El tachón en diagonal que cierra un grupo de cinco. */
const SLASH = `M1 17 C10 14 20 8 ${GROUP_W - 2} 5`;

/**
 * Conteo a mano con palitos (DISENO §7): el progreso de la ronda y los intentos que quedan.
 * Se dibuja en pluma, de cinco en cinco con su tachón.
 */
export function Tally({ total, count, accessibilityLabel, tone = 'ink' }: Props) {
  const { colors, spacing } = useTheme();
  const inkColor = tone === 'chile' ? colors.chile : colors.ink;
  const groups = Math.ceil(total / 5);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `${count} de ${total}`}
      accessibilityValue={{ min: 0, max: total, now: count }}
      style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}
    >
      {Array.from({ length: groups }, (_, g) => {
        const first = g * 5;
        const size = Math.min(5, total - first);
        const full = size === 5;
        return (
          <Svg key={g} width={GROUP_W} height={H} viewBox={`0 0 ${GROUP_W} ${H}`} fill="none">
            {Array.from({ length: size }, (_, k) => {
              const i = first + k;
              return (
                <Path
                  key={i}
                  d={markPath(k)}
                  stroke={i < count ? inkColor : colors.inkFaint}
                  strokeOpacity={i < count ? 1 : 0.55}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })}
            {full ? (
              <Path
                d={SLASH}
                stroke={first + 5 <= count ? inkColor : colors.inkFaint}
                strokeOpacity={first + 5 <= count ? 1 : 0.55}
                strokeWidth={2}
                strokeLinecap="round"
              />
            ) : null}
          </Svg>
        );
      })}
    </View>
  );
}

/** "3 de 10" con palitos al lado. */
export function TallyLine({
  total,
  count,
  label,
}: {
  total: number;
  count: number;
  label: string;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="small" muted>
        {label}
      </Text>
      <Tally total={total} count={count} />
    </View>
  );
}

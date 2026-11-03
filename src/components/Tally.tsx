import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type Props = {
  /** Cuántos puntos hay en total. */
  total: number;
  /** Cuántos ya están marcados. */
  count: number;
  /** Texto para lectores de pantalla, p. ej. "3 de 10". */
  accessibilityLabel?: string;
  /** `chile` pinta los marcados en `danger` (intentos gastados). */
  tone?: 'ink' | 'chile';
};

/**
 * @deprecated Bitácora: se quita al rediseñar pantallas. Ya no son palitos: una hilera de
 * puntos, los marcados en `ink`.
 */
export function Tally({ total, count, accessibilityLabel, tone = 'ink' }: Props) {
  const { colors, spacing } = useTheme();
  const on = tone === 'chile' ? colors.danger : colors.ink;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `${count} de ${total}`}
      accessibilityValue={{ min: 0, max: total, now: count }}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, alignItems: 'center' }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: i < count ? on : colors.surface2,
          }}
        />
      ))}
    </View>
  );
}

/**
 * "3 de 10" con puntos al lado.
 * @deprecated Bitácora: se quita al rediseñar pantallas.
 */
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
      <Text variant="note" muted>
        {label}
      </Text>
      <Tally total={total} count={count} />
    </View>
  );
}

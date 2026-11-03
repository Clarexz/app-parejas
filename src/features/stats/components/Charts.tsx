import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components';
import { useTheme } from '@/theme';

const CHART_HEIGHT = 120;

/**
 * Barras verticales simples (una por mes) en `ink`, con la cifra sobre cada barra que tiene algo.
 * Sin ejes ni cuadrícula: el número va escrito.
 */
export function BarChart({
  bars,
  accessibilityLabel,
}: {
  bars: readonly { label: string; value: number }[];
  accessibilityLabel: string;
}) {
  const { colors, spacing } = useTheme();
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }}
    >
      {bars.map((b, i) => {
        const h = b.value === 0 ? 4 : Math.max(8, Math.round((b.value / max) * CHART_HEIGHT));
        return (
          <View key={`${b.label}-${i}`} style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
            <Text
              variant="note"
              tone={b.value === 0 ? 'muted' : 'ink'}
              style={{ fontVariant: ['tabular-nums'], opacity: b.value === 0 ? 0 : 1 }}
              numberOfLines={1}
            >
              {b.value}
            </Text>
            <View
              style={{
                width: '100%',
                height: h,
                borderRadius: 6,
                backgroundColor: b.value === 0 ? colors.surface2 : colors.ink,
              }}
            />
            <Text variant="note" tone="muted" numberOfLines={1} style={{ fontSize: 14 }}>
              {b.label.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Barra horizontal con su nombre arriba y una cifra a la derecha. */
export function MeterBar({
  label,
  value,
  max,
  color,
  dot,
  trailing,
  accessibilityLabel,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  /** Punto de fruta para barras por persona. */
  dot?: ReactNode;
  /** Texto de la derecha; por defecto el valor. */
  trailing?: string;
  accessibilityLabel?: string;
}) {
  const { colors, spacing } = useTheme();
  const ratio = Math.min(1, Math.max(0, max > 0 ? value / max : 0));
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? `${label}: ${trailing ?? value}`}
      style={{ gap: spacing.xs }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {dot}
        <Text variant="body" style={{ flex: 1 }}>
          {label}
        </Text>
        <Text variant="ui" style={{ fontVariant: ['tabular-nums'] }}>
          {trailing ?? value}
        </Text>
      </View>
      <View
        style={{
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.surface2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 10,
            borderRadius: 5,
            width: `${Math.round(ratio * 100)}%`,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

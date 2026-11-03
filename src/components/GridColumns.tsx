import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type GridColumn = { label: string; value: number };

type Props = {
  columns: readonly GridColumn[];
  /** Casillas de alto de cada columna. */
  rows?: number;
  tone?: 'jamaica' | 'nopal' | 'ink';
  /** Texto para lectores de pantalla (un resumen de toda la gráfica). */
  accessibilityLabel: string;
};

/** Casillas pintadas de una columna: con más de `rows` se escala; un valor > 0 pinta al menos una. */
export function filledCells(value: number, max: number, rows: number): number {
  if (value <= 0 || max <= 0) return 0;
  if (max <= rows) return Math.min(value, rows);
  return Math.max(1, Math.round((value * rows) / max));
}

const GAP = 2;

/**
 * @deprecated Bitácora: se quita al rediseñar pantallas. Columnas de casillas redondeadas;
 * `jamaica` = tu fruta y `nopal` = la de tu pareja.
 */
export function GridColumns({ columns, rows = 8, tone = 'jamaica', accessibilityLabel }: Props) {
  const { colors, spacing, fruit } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const max = Math.max(0, ...columns.map((c) => c.value));
  const fill = { jamaica: fruit.me.hex, nopal: (fruit.partner ?? fruit.me).hex, ink: colors.ink }[
    tone
  ];
  const n = Math.max(1, columns.length);
  const cell = width > 0 ? Math.floor((width - GAP * (n - 1)) / n) : 0;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      style={{ gap: spacing.xs }}
    >
      {cell > 0 ? (
        <View style={{ flexDirection: 'row', gap: GAP }}>
          {columns.map((c, i) => {
            const filled = filledCells(c.value, max, rows);
            return (
              <View key={`${c.label}-${i}`} style={{ width: cell, gap: GAP }}>
                <View style={{ gap: GAP }}>
                  {Array.from({ length: rows }, (_, r) => {
                    // De abajo hacia arriba: la fila 0 es la de arriba.
                    const on = rows - r <= filled;
                    return (
                      <View
                        key={r}
                        style={{
                          width: cell,
                          height: cell,
                          borderRadius: 4,
                          backgroundColor: on ? fill : colors.surface2,
                        }}
                      />
                    );
                  })}
                </View>
                <Text
                  variant="note"
                  muted
                  numberOfLines={1}
                  maxFontSizeMultiplier={1}
                  style={{ width: cell, textAlign: 'center' }}
                >
                  {c.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

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
 * Gráfica de columnas hecha de cuadritos de la cuadrícula del cuaderno, coloreados (DISENO §7).
 * Sin ejes ni barras: cada casilla pintada es un punto, la etiqueta va debajo en `caption`.
 */
export function GridColumns({ columns, rows = 8, tone = 'jamaica', accessibilityLabel }: Props) {
  const { colors, spacing } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const max = Math.max(0, ...columns.map((c) => c.value));
  const fill = colors[tone];
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
                          backgroundColor: on ? fill : 'transparent',
                          borderWidth: 1,
                          borderColor: on ? fill : colors.ruled,
                        }}
                      />
                    );
                  })}
                </View>
                <Text
                  variant="caption"
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

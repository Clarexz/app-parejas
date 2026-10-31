import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { Text } from '@/components';
import { visitCalendar, type VisitLike } from '@/lib/visits';
import { useTheme } from '@/theme';

const COLUMNS = 3;
const BLOCK_GAP = 8;
const MAX_PITCH = 16;
/** Ancho de partida mientras llega la medida real (celular chico). */
const DEFAULT_WIDTH = 296;

type Props = {
  visits: readonly VisitLike[];
  year: number;
  today: string;
};

/**
 * El año como página de cuaderno: 12 mini meses en 3 columnas, una casilla por día (≤ 14 dp,
 * semana que empieza en lunes). Días juntos en Jamaica, hoy con contorno de tinta y los días que
 * todavía no llegan solo como cuadrícula.
 */
export function VisitCalendar({ visits, year, today }: Props) {
  const { colors, spacing, radius } = useTheme();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const months = visitCalendar(visits, year, today);
  const pitch = Math.min(
    MAX_PITCH,
    Math.max(8, Math.floor((width - (COLUMNS - 1) * BLOCK_GAP) / (COLUMNS * 7))),
  );
  const cell = pitch - 2;
  const together = months.reduce((n, m) => n + m.days.filter((d) => d.together).length, 0);

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`Calendario de ${year}: ${together} ${together === 1 ? 'día' : 'días'} juntos`}
      style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: BLOCK_GAP, rowGap: spacing.md }}
    >
      {months.map((m) => (
        <View key={m.month} style={{ width: pitch * 7, gap: spacing.xs }}>
          <Text variant="mono" tone="muted">
            {m.label}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: m.offset }, (_, i) => (
              <View key={`b${i}`} style={{ width: pitch, height: pitch }} />
            ))}
            {m.days.map((d) => (
              <View key={d.iso} style={{ width: pitch, height: pitch }}>
                <View
                  style={{
                    width: cell,
                    height: cell,
                    borderRadius: radius.xs,
                    backgroundColor: d.together
                      ? colors.jamaica
                      : d.future
                        ? 'transparent'
                        : colors.grid,
                    borderWidth: d.today ? 1.5 : d.future ? 1 : 0,
                    borderColor: d.today ? colors.ink : colors.grid,
                  }}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

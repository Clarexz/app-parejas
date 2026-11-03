import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { Text } from '@/components';
import { visitCalendar, type VisitLike } from '@/lib/visits';
import { useTheme } from '@/theme';

const COLUMNS = 2;
const BLOCK_GAP = 24;
/** Ancho de partida mientras llega la medida real (celular chico). */
const DEFAULT_WIDTH = 320;

type Props = {
  visits: readonly VisitLike[];
  year: number;
  today: string;
};

/** Un día juntos: círculo partido a la mitad, tu fruta a la izquierda y la de tu pareja a la derecha. */
function TogetherDot({ size, left, right }: { size: number; left: string; right: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        flexDirection: 'row',
      }}
    >
      <View style={{ flex: 1, backgroundColor: left }} />
      <View style={{ flex: 1, backgroundColor: right }} />
    </View>
  );
}

/**
 * El año en 12 meses de días en círculos (semana que empieza en lunes). Día juntos = círculo con
 * las dos frutas; separados = círculo vacío en `surface2`; hoy lleva un aro de `ink`; los días que
 * todavía no llegan, solo un contorno tenue.
 */
export function VisitCalendar({ visits, year, today }: Props) {
  const { colors, spacing, fruit } = useTheme();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const months = visitCalendar(visits, year, today);
  const monthWidth = Math.floor((width - (COLUMNS - 1) * BLOCK_GAP) / COLUMNS);
  const pitch = Math.floor(monthWidth / 7);
  const cell = Math.max(10, pitch - 6);
  const together = months.reduce((n, m) => n + m.days.filter((d) => d.together).length, 0);
  const meHex = fruit.me.hex;
  const partnerHex = (fruit.partner ?? fruit.me).hex;

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`Calendario de ${year}: ${together} ${together === 1 ? 'día' : 'días'} juntos`}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        columnGap: BLOCK_GAP,
        rowGap: spacing.xl,
      }}
    >
      {months.map((m) => (
        <View key={m.month} style={{ width: pitch * 7, gap: spacing.sm }}>
          <Text variant="label" tone="muted">
            {m.label}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: m.offset }, (_, i) => (
              <View key={`b${i}`} style={{ width: pitch, height: pitch }} />
            ))}
            {m.days.map((d) => (
              <View
                key={d.iso}
                style={{
                  width: pitch,
                  height: pitch,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: cell + 4,
                    height: cell + 4,
                    borderRadius: (cell + 4) / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: d.today ? 2 : 0,
                    borderColor: colors.ink,
                  }}
                >
                  {d.together ? (
                    <TogetherDot size={cell} left={meHex} right={partnerHex} />
                  ) : (
                    <View
                      style={{
                        width: cell,
                        height: cell,
                        borderRadius: cell / 2,
                        backgroundColor: d.future ? 'transparent' : colors.surface2,
                        borderWidth: d.future ? 1 : 0,
                        borderColor: colors.line,
                      }}
                    />
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

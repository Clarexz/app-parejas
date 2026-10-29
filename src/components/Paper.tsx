import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

export type PaperVariant = 'notebook' | 'plain' | 'ruled';

/** Hoja de fondo (DISENO §4): ocupa todo el espacio detrás del contenido. */
export function Paper({ variant = 'notebook' }: { variant?: PaperVariant }) {
  const { colors, page } = useTheme();
  const cell = page.grid;
  const row = cell * 2;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.paper }]}>
      {variant === 'plain' ? null : (
        <Svg width="100%" height="100%">
          <Defs>
            {variant === 'notebook' ? (
              <Pattern id="grid" width={cell} height={cell} patternUnits="userSpaceOnUse">
                <Line x1={0} y1={0.5} x2={cell} y2={0.5} stroke={colors.grid} strokeWidth={1} />
                <Line x1={0.5} y1={0} x2={0.5} y2={cell} stroke={colors.grid} strokeWidth={1} />
              </Pattern>
            ) : (
              <Pattern id="rows" width={row} height={row} patternUnits="userSpaceOnUse">
                <Line
                  x1={0}
                  y1={row - 0.5}
                  x2={row}
                  y2={row - 0.5}
                  stroke={colors.ruled}
                  strokeWidth={1}
                />
              </Pattern>
            )}
          </Defs>
          <Rect
            x={0}
            y={0}
            width="100%"
            height="100%"
            fill={variant === 'notebook' ? 'url(#grid)' : 'url(#rows)'}
          />
          <Line
            x1={page.marginX}
            y1={0}
            x2={page.marginX}
            y2="100%"
            stroke={colors.margin}
            strokeWidth={1.5}
          />
        </Svg>
      )}
    </View>
  );
}

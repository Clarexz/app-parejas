import { useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

type Props = {
  variant?: 'dashed' | 'solid';
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 6;
const STEP = 28;

/** Trazo con leve ondulación: una curva suave por tramo, alternando arriba y abajo. */
export function wavyPath(width: number): string {
  if (width <= 0) return '';
  const mid = HEIGHT / 2;
  let d = `M0 ${mid}`;
  for (let x = 0; x < width; x += STEP) {
    const end = Math.min(x + STEP, width);
    const dy = (Math.floor(x / STEP) % 2 === 0 ? -1 : 1) * 1.5;
    d += ` Q${(x + end) / 2} ${mid + dy} ${end} ${mid}`;
  }
  return d;
}

/** Línea hecha a mano, punteada o continua (DISENO §7). */
export function Divider({ variant = 'dashed', style }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return (
    <View
      onLayout={onLayout}
      accessibilityRole="none"
      importantForAccessibility="no-hide-descendants"
      style={[{ height: HEIGHT, alignSelf: 'stretch' }, style]}
    >
      {width > 0 ? (
        <Svg width={width} height={HEIGHT} fill="none">
          <Path
            d={wavyPath(width)}
            stroke={colors.inkMuted}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray={variant === 'dashed' ? [6, 5] : undefined}
          />
        </Svg>
      ) : null}
    </View>
  );
}

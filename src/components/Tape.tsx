import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

export type TapeColor = 'yellow' | 'mint' | 'pink';

type Props = {
  color?: TapeColor;
  width?: number;
  height?: number;
  /** Inclinación en grados (DISENO §2.6). */
  rotate?: number;
  style?: StyleProp<ViewStyle>;
};

/** Cinta washi semitransparente con extremos dentados (DISENO §4). */
export function Tape({ color = 'yellow', width = 48, height = 16, rotate = -4, style }: Props) {
  const { colors } = useTheme();
  const fill = { yellow: colors.tapeYellow, mint: colors.tapeMint, pink: colors.tapePink }[color];
  const w = width;
  const h = height;
  // Extremos en zigzag: la cinta se corta con los dedos, no con tijeras.
  const d = `M2 0 L${w - 2} 0 L${w} ${h * 0.25} L${w - 2} ${h * 0.5} L${w} ${h * 0.75} L${w - 2} ${h} L2 ${h} L0 ${h * 0.75} L2 ${h * 0.5} L0 ${h * 0.25} Z`;
  return (
    <Svg
      width={w}
      height={h}
      pointerEvents="none"
      style={[{ transform: [{ rotate: `${rotate}deg` }] }, style]}
    >
      <Path d={d} fill={fill} />
    </Svg>
  );
}

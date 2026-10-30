import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

export type DoodleKind = 'underline' | 'circle' | 'arrow' | 'star';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Geometría de cada garabato: viewBox, trazo (un solo path, para que el dibujado sea continuo)
 * y longitud aproximada (algo mayor que la real) para el stroke-dashoffset.
 */
const shapes: Record<DoodleKind, { w: number; h: number; d: string; length: number }> = {
  underline: { w: 100, h: 20, d: 'M2 12 C20 6 40 16 60 10 S90 8 98 11', length: 110 },
  circle: {
    w: 100,
    h: 40,
    d: 'M52 4 C20 2 3 14 6 24 C9 36 40 38 66 35 C90 32 98 18 85 9 C75 3 55 3 40 5',
    length: 330,
  },
  arrow: { w: 100, h: 30, d: 'M3 18 C30 10 55 22 92 14 M80 5 L93 14 L82 25', length: 135 },
  star: {
    w: 24,
    h: 24,
    d: 'M12 3 L14.5 9.5 L21 10 L16 14.5 L17.5 21 L12 17.5 L6.5 21 L8 14.5 L3 10 L9.5 9.5 Z',
    length: 90,
  },
};

type Props = {
  kind?: DoodleKind;
  width?: number;
  /** Por defecto Jamaica. */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** Garabato de énfasis que se dibuja una sola vez al montar, ~600 ms (DISENO §5). */
export function Doodle({ kind = 'underline', width = 120, color, style }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const shape = shapes[kind];
  const height = (width * shape.h) / shape.w;
  const offset = useSharedValue(reduced ? 0 : shape.length);

  useEffect(() => {
    if (reduced) {
      offset.value = 0;
      return;
    }
    offset.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [reduced, offset]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${shape.w} ${shape.h}`}
      fill="none"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
    >
      <AnimatedPath
        d={shape.d}
        stroke={color ?? colors.jamaica}
        strokeWidth={kind === 'star' ? 1.6 : 2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={[shape.length, shape.length]}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

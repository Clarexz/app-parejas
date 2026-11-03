import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

import { iconPaths, type IconShape } from './icons/paths';

export type IconName = keyof typeof iconPaths;

export const ICON_NAMES = Object.keys(iconPaths) as IconName[];

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** El trazo se "dibuja" una vez al montar, ~600 ms (DISENO §5): la flama de la racha. */
  draw?: boolean;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
// Más larga que cualquier trazo del set (cuadrícula 24×24).
const DRAW_LENGTH = 90;

function DrawnPath({ d, color, fill }: { d: string; color: string; fill: boolean }) {
  const reduced = useReducedMotion();
  const offset = useSharedValue(reduced ? 0 : DRAW_LENGTH);
  useEffect(() => {
    offset.value = reduced ? 0 : withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [reduced, offset]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={fill ? color : 'none'}
      strokeDasharray={[DRAW_LENGTH, DRAW_LENGTH]}
      animatedProps={animatedProps}
    />
  );
}

/** Icono del set propio (DISENO §4). Color por defecto: `ink`. */
export function Icon({ name, size = 24, color, draw = false }: Props) {
  const { colors } = useTheme();
  const stroke = color ?? colors.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      {(iconPaths[name] as IconShape[]).map((shape, i) => {
        const { d, fill = false, dash } = typeof shape === 'string' ? { d: shape } : shape;
        // Los trazos punteados no se "dibujan": el dash es parte de la forma.
        return draw && !dash ? (
          <DrawnPath key={i} d={d} color={stroke} fill={fill} />
        ) : (
          <Path
            key={i}
            d={d}
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dash ? dash.split(' ').map(Number) : undefined}
            fill={fill ? stroke : 'none'}
          />
        );
      })}
    </Svg>
  );
}

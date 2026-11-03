import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { FRUITS, type Fruit, type FruitKey } from '@/lib/fruits';
import { useTheme } from '@/theme';

import { bezierOf } from './motion';

/** Una fruta o su llave (`'sandia'`). */
export type FruitLike = Fruit | FruitKey;

export function fruitOf(value: FruitLike): Fruit {
  return typeof value === 'string' ? FRUITS[value] : value;
}

export function fruitHex(value: FruitLike): string {
  return fruitOf(value).hex;
}

export type SymbolAnimation = 'none' | 'arrive' | 'breathe';

type Props = {
  size?: number;
  /** Mitad izquierda (tú, salvo que se indique). Por defecto tu fruta. */
  left?: FruitLike;
  /** Mitad derecha (tu pareja). Por defecto la fruta de tu pareja, o la sugerida. */
  right?: FruitLike;
  /** `arrive`: llegan desde fuera (la firma, §5). `breathe`: cargando. */
  animate?: SymbolAnimation;
  accessibilityLabel?: string;
};

// Geometría del símbolo (DISENO §3), viewBox 0 0 100 100: rendija de 8 % entre las mitades.
export const SYMBOL_LEFT = 'M46 4 A46 46 0 0 0 46 96 Z';
export const SYMBOL_RIGHT = 'M54 4 A46 46 0 0 1 54 96 Z';

/** Dos medias lunas —una por persona— que se acercan pero nunca se tocan (DISENO §3). */
export function BrandSymbol({
  size = 24,
  left,
  right,
  animate = 'none',
  accessibilityLabel,
}: Props) {
  const { fruit, motion } = useTheme();
  const reduced = useReducedMotion();
  const leftFruit = left ?? fruit.me;
  const rightFruit = right ?? fruit.partner ?? FRUITS[fruit.me.suggested];

  // 0 = en su sitio. `arrive` parte de afuera; `breathe` se separa un poco y regresa.
  const t = useSharedValue(animate === 'arrive' && !reduced ? 1 : 0);
  const fade = useSharedValue(animate === 'arrive' && reduced ? 0 : 1);
  useEffect(() => {
    if (animate === 'arrive') {
      if (reduced) {
        fade.value = withTiming(1, { duration: motion.reduced });
      } else {
        t.value = 1;
        t.value = withSpring(0, motion.spring);
      }
    } else if (animate === 'breathe' && !reduced) {
      t.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: bezierOf(motion.base) }),
          withTiming(0, { duration: 600, easing: bezierOf(motion.base) }),
        ),
        -1,
      );
    } else {
      t.value = 0;
    }
  }, [animate, reduced, t, fade, motion]);

  const reach = animate === 'arrive' ? Math.max(8, size * 0.5) : Math.max(2, size / 12);
  const leftStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: -reach * t.value }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: reach * t.value }],
  }));

  const half = (d: string, color: string) => (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d={d} fill={color} />
    </Svg>
  );

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      style={{ width: size, height: size }}
    >
      <Animated.View style={[{ position: 'absolute' }, leftStyle]}>
        {half(SYMBOL_LEFT, fruitHex(leftFruit))}
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, rightStyle]}>
        {half(SYMBOL_RIGHT, fruitHex(rightFruit))}
      </Animated.View>
    </View>
  );
}

// El nombre público es `Symbol` (DISENO §7), pero declararlo o importarlo con ese nombre tapa al
// `Symbol` global del archivo (los helpers de Babel lo usan): dentro del código se importa
// como `BrandSymbol`.
export { BrandSymbol as Symbol };

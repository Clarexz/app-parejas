import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

export { Easing };

/** Easing de un token de movimiento (`motion.base`, `motion.exit`). */
export function bezierOf(token: { readonly bezier: readonly [number, number, number, number] }) {
  return Easing.bezier(...token.bezier);
}

/**
 * Presionar (DISENO §5, `tap`): escala 0.97 en 120 ms. Con "reducir movimiento" no escala,
 * solo cambia la opacidad. Úsalo con `onPressIn`/`onPressOut` de un `Pressable`.
 */
export function useTapScale() {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  // Sin `opacity` fuera de "reducir movimiento": así no pisa la opacidad del deshabilitado.
  const style = useAnimatedStyle(() =>
    reduced
      ? { opacity: 1 - 0.15 * press.value }
      : { transform: [{ scale: 1 - (1 - motion.tap.scale) * press.value }] },
  );
  const set = (v: 0 | 1) => {
    press.value = withTiming(v, { duration: reduced ? motion.reduced : motion.tap.duration });
  };
  return { style, onPressIn: () => set(1), onPressOut: () => set(0) };
}

/**
 * Entrada de algo que "llega" (toast, aviso): sube 12 dp con `spring`. Con "reducir movimiento"
 * solo hay un fundido de 150 ms.
 */
export function useArrive() {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      fade.value = withTiming(1, { duration: motion.reduced });
      return;
    }
    fade.value = withTiming(1, { duration: motion.tap.duration });
    progress.value = withSpring(1, motion.spring);
  }, [reduced, progress, fade, motion]);

  return useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: (1 - progress.value) * 12 }],
  }));
}

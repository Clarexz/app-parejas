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

/**
 * "Pegar" (DISENO §5): el objeto cae 12 dp con 4° extra y se asienta en su `tilt` con
 * `springStick`. Con "reducir movimiento" solo hay un fundido de 120 ms.
 */
export function useStickIn(tilt: number) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0); // 0 = recién llegado, 1 = asentado
  const fade = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      fade.value = withTiming(1, { duration: motion.duration.fast });
      return;
    }
    fade.value = withTiming(1, { duration: motion.duration.fast });
    progress.value = withSpring(1, motion.springStick);
  }, [reduced, progress, fade, motion]);

  return useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateY: (1 - progress.value) * -12 },
      { rotate: `${tilt + (1 - progress.value) * 4}deg` },
    ],
  }));
}

export { Easing };

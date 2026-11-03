import { useEffect, type ReactNode } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

/**
 * Cuando sube `pulse` (llegó un mood nuevo de tu pareja) la burbuja "llega": escala de 0.94 a 1
 * con `spring`. Con "reducir movimiento" solo hay un fundido (DISENO §5).
 */
export function PulseView({ pulse, children }: { pulse: number; children: ReactNode }) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const fade = useSharedValue(1);

  useEffect(() => {
    if (pulse === 0) return;
    if (reduced) {
      fade.value = 0.3;
      fade.value = withTiming(1, { duration: motion.reduced });
      return;
    }
    scale.value = 0.94;
    scale.value = withSpring(1, motion.spring);
  }, [pulse, reduced, scale, fade, motion]);

  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: scale.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Sticker } from '@/components';
import { useTheme } from '@/theme';

type Props = {
  emoji?: string;
  label?: string;
  /** Cada vez que sube, el sticker "late" dos veces (llegó un mood nuevo). */
  pulse?: number;
};

/** Sticker de mood; late (1 → 1.15 → 1, dos veces) cuando cambia `pulse`. Sin escala con "reducir movimiento". */
export function MoodSticker({ emoji, label, pulse = 0 }: Props) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const d = motion.duration.fast;

  useEffect(() => {
    if (pulse === 0 || reduced) return;
    scale.value = withSequence(
      withTiming(1.15, { duration: d }),
      withTiming(1, { duration: d }),
      withTiming(1.15, { duration: d }),
      withTiming(1, { duration: d }),
    );
  }, [pulse, reduced, d, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Sticker emoji={emoji} label={label} tone="postit" tilt={4} />
    </Animated.View>
  );
}

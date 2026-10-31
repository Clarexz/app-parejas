import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { Stamp } from './Stamp';

type Props = { label?: string };

/**
 * Sello grande que baja al terminar de guardar algo importante (DISENO §5 "Sellar"): escala
 * 1.15→1 en `base` sobre el velo. Con "reducir movimiento" solo se funde. La háptica
 * (`haptic.stamp`) la dispara quien lo monta.
 */
export function SealOverlay({ label = 'PEGADA' }: Props) {
  const { colors, motion } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: reduced ? motion.duration.fast : motion.duration.base,
      easing: Easing.out(Easing.cubic),
    });
  }, [reduced, motion, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: reduced ? 2.4 : 2.4 * (1.15 - 0.15 * progress.value) }],
  }));
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.scrim,
      }}
    >
      <Animated.View style={style}>
        <Stamp tone="nopal" rotate={-6} style={{ backgroundColor: colors.paperRaised }}>
          {label}
        </Stamp>
      </Animated.View>
    </View>
  );
}

import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Doodle, Text } from '@/components';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

type Props = {
  /** Racha nueva (días); null si no se pudo saber. */
  streak: number | null;
  onClose: () => void;
};

const AUTO_CLOSE_MS = 2500;

/**
 * Celebración de "día completo" (DISENO §5, "sellar"): un sello grande baja con `springStick`
 * sobre un velo; se cierra solo en ~2.5 s o al tocar. Con "reducir movimiento" solo se funde.
 */
export function Celebration({ streak, onClose }: Props) {
  const { colors, spacing, radius, shadows, motion } = useTheme();
  const reduced = useReducedMotion();
  const veil = useSharedValue(0);
  const drop = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    haptic.success();
    veil.value = withTiming(1, { duration: motion.duration.base });
    if (reduced) drop.value = withTiming(1, { duration: motion.duration.fast });
    else drop.value = withSpring(1, motion.springStick);
    const timer = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [reduced, motion, veil, drop, onClose]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const stampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 2),
    transform: reduced
      ? []
      : [
          { translateY: (1 - drop.value) * -140 },
          { scale: 1 + (1 - drop.value) * 0.6 },
          { rotate: '-3deg' },
        ],
  }));

  const label =
    streak && streak > 0
      ? `Día completo. Llevan ${streak} ${streak === 1 ? 'día seguido' : 'días seguidos'}.`
      : 'Día completo.';

  return (
    <Pressable
      onPress={onClose}
      accessibilityRole="alert"
      accessibilityLabel={label}
      accessibilityHint="Toca para cerrar"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
          { backgroundColor: colors.scrim },
          veilStyle,
        ]}
      />
      <Animated.View style={stampStyle}>
        <View
          style={{
            backgroundColor: colors.paperRaised,
            borderWidth: 3,
            borderColor: colors.jamaica,
            borderRadius: radius.xs,
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.xxl,
            alignItems: 'center',
            gap: spacing.xs,
            boxShadow: shadows.lifted,
          }}
        >
          <Text variant="stamp" tone="jamaica">
            LOS DOS CONTESTARON
          </Text>
          <Text variant="display" tone="jamaica" style={{ textAlign: 'center' }}>
            ¡Día completo!
          </Text>
          {streak && streak > 0 ? (
            <View style={{ alignItems: 'center' }}>
              <Text variant="hero">{streak}</Text>
              <Doodle kind="underline" width={96} color={colors.cempasuchil} />
              <Text variant="hand" tone="muted">
                {streak === 1 ? 'día seguido' : 'días seguidos'}
              </Text>
            </View>
          ) : null}
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', top: -14, right: -10 }}>
          <Doodle kind="star" width={30} color={colors.cempasuchil} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', bottom: -12, left: -12 }}>
          <Doodle kind="star" width={24} color={colors.jamaica} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

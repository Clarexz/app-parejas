import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

type Props = { count?: number; accessibilityLabel?: string };

// Anchos distintos para que parezca texto escribiéndose, no una barra de progreso.
const WIDTHS = [0.92, 0.7, 0.84, 0.56, 0.78];

function Line({ index, width }: { index: number; width: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      index * 160,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 500 }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      ),
    );
  }, [reduced, index, progress]);
  const style = useAnimatedStyle(() => ({ width: `${progress.value * width * 100}%` }));
  return (
    <Animated.View
      style={[{ height: 2, borderRadius: 1, backgroundColor: colors.inkFaint }, style]}
    />
  );
}

/** Carga: renglones que se escriben solos, en lugar de un spinner (DISENO §8). */
export function LoadingLines({ count = 5, accessibilityLabel = 'Cargando' }: Props) {
  const { spacing } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      style={{ gap: spacing.xl, paddingVertical: spacing.md }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Line key={i} index={i} width={WIDTHS[i % WIDTHS.length]} />
      ))}
    </View>
  );
}

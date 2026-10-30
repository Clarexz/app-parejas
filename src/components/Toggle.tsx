import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Obligatorio: el interruptor no lleva texto propio. */
  accessibilityLabel: string;
  disabled?: boolean;
};

const WIDTH = 56;
const HEIGHT = 32;
const THUMB = 22;
const PAD = 5;

/** Interruptor: pastilla de contorno de tinta; encendido en Jamaica (DISENO §7). */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled = false }: Props) {
  const { colors, radius, motion } = useTheme();
  const reduced = useReducedMotion();
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    on.value = reduced
      ? value
        ? 1
        : 0
      : withTiming(value ? 1 : 0, { duration: motion.duration.fast });
  }, [value, reduced, on, motion.duration.fast]);

  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: on.value * (WIDTH - THUMB - PAD * 2 - 3) }],
  }));

  const track = disabled ? colors.inkFaint : value ? colors.jamaica : colors.inkMuted;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={6}
      style={({ pressed }) => ({
        width: WIDTH,
        height: HEIGHT,
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: track,
        backgroundColor: value && !disabled ? colors.jamaica : colors.paperRaised,
        justifyContent: 'center',
        paddingHorizontal: PAD,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Animated.View
        style={[
          {
            width: THUMB,
            height: THUMB,
            borderRadius: radius.pill,
            backgroundColor: value && !disabled ? colors.onJamaica : track,
          },
          thumb,
        ]}
      />
    </Pressable>
  );
}

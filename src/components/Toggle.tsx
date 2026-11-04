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
const THUMB = 24;
const PAD = 4;

/** Interruptor de píldora; encendido = tu fruta (DISENO §7). */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled = false }: Props) {
  const { colors, radius, motion, fruit } = useTheme();
  const reduced = useReducedMotion();
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    const target = value ? 1 : 0;
    on.value = reduced
      ? withTiming(target, { duration: motion.reduced })
      : withTiming(target, { duration: motion.base.duration });
  }, [value, reduced, on, motion]);

  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: on.value * (WIDTH - THUMB - PAD * 2) }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={({ pressed }) => ({
        width: WIDTH,
        height: HEIGHT,
        borderRadius: radius.pill,
        backgroundColor: value ? fruit.me.hex : colors.surface2,
        justifyContent: 'center',
        paddingHorizontal: PAD,
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      })}
    >
      <Animated.View
        style={[
          {
            width: THUMB,
            height: THUMB,
            borderRadius: radius.pill,
            backgroundColor: value ? fruit.me.on : colors.inkMuted,
          },
          thumb,
        ]}
      />
    </Pressable>
  );
}

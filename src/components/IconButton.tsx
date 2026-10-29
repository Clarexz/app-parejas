import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';

type Props = {
  name: IconName;
  onPress?: () => void;
  variant?: 'plain' | 'sticker';
  disabled?: boolean;
  /** Obligatorio: el botón no tiene texto visible. */
  accessibilityLabel: string;
};

/** Icono tocable de 44×44 (DISENO §7). */
export function IconButton({
  name,
  onPress,
  variant = 'plain',
  disabled = false,
  accessibilityLabel,
}: Props) {
  const { colors, radius, shadows, motion } = useTheme();
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.08 * press.value }] }));
  const sticker = variant === 'sticker';
  const iconColor = disabled ? colors.inkFaint : sticker ? colors.onJamaica : colors.ink;
  const set = (v: number) => {
    press.value = reduced ? v : withTiming(v, { duration: motion.duration.fast });
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => set(1)}
      onPressOut={() => set(0)}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={[
          {
            width: sticker ? 40 : 44,
            height: sticker ? 40 : 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.pill,
            backgroundColor: sticker ? (disabled ? colors.inkFaint : colors.jamaica) : undefined,
            boxShadow: sticker && !disabled ? shadows.ink : undefined,
          },
          animated,
        ]}
      >
        <Icon name={name} size={24} color={iconColor} />
      </Animated.View>
    </Pressable>
  );
}

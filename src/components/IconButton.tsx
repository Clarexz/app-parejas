import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { useTapScale } from './motion';

type Props = {
  name: IconName;
  onPress?: () => void;
  /** `filled`: círculo `action`. `soft`: círculo `surface2`. */
  variant?: 'plain' | 'filled' | 'soft';
  disabled?: boolean;
  /** Obligatorio: el botón no tiene texto visible. */
  accessibilityLabel: string;
};

/** Ícono tocable de 48×48 (DISENO §7). */
export function IconButton({
  name,
  onPress,
  variant = 'plain',
  disabled = false,
  accessibilityLabel,
}: Props) {
  const { colors, radius } = useTheme();
  const tap = useTapScale();
  const filled = variant === 'filled';
  const soft = variant === 'soft';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={tap.onPressIn}
      onPressOut={tap.onPressOut}
      // La opacidad del deshabilitado va aquí para que la animación de toque no la pise.
      style={{
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Animated.View
        style={[
          {
            width: filled || soft ? 44 : 48,
            height: filled || soft ? 44 : 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.pill,
            backgroundColor: filled ? colors.action : soft ? colors.surface2 : undefined,
          },
          tap.style,
        ]}
      >
        <Icon name={name} size={24} color={filled ? colors.onAction : colors.ink} />
      </Animated.View>
    </Pressable>
  );
}

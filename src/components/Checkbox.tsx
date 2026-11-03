import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';

type Props = {
  checked: boolean;
  onPress: () => void;
  /** Obligatorio: la casilla no lleva texto propio. */
  accessibilityLabel: string;
  disabled?: boolean;
  /** `lg`: círculo de 32 dp (detalle de listas). */
  size?: 'md' | 'lg';
};

/** Casilla redonda de 24 dp: marcada = círculo de tu fruta con palomita (DISENO §7). */
export function Checkbox({
  checked,
  onPress,
  accessibilityLabel,
  disabled = false,
  size = 'md',
}: Props) {
  const { colors, fruit, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: size === 'lg' ? 32 : 26,
          height: size === 'lg' ? 32 : 26,
          borderRadius: radius.pill,
          borderWidth: 2,
          borderColor: checked ? fruit.me.hex : colors.inkMuted,
          backgroundColor: checked ? fruit.me.hex : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icon name="tick" size={size === 'lg' ? 22 : 18} color={fruit.me.on} /> : null}
      </View>
    </Pressable>
  );
}

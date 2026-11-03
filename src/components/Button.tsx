import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { LoadingSymbol } from './LoadingSymbol';
import { useTapScale } from './motion';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  /** Ocupa todo el ancho (formularios, auth y onboarding). */
  fullWidth?: boolean;
  size?: 'md' | 'sm';
  /** @deprecated Bitácora: se quita al rediseñar pantallas. Ya no hay post-its. */
  onNote?: boolean;
};

/** Botón del sistema (DISENO §7): píldora de 50 dp. Una sola `primary` por pantalla. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  size = 'md',
}: Props) {
  const { colors, spacing, radius, type } = useTheme();
  const tap = useTapScale();
  const inactive = disabled || loading;

  const bg = {
    primary: colors.action,
    secondary: colors.surface2,
    ghost: undefined,
    danger: undefined,
  }[variant];
  const fg = {
    primary: colors.onAction,
    secondary: colors.ink,
    ghost: colors.ink,
    danger: colors.danger,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={tap.onPressIn}
      onPressOut={tap.onPressOut}
      style={{ alignSelf: fullWidth ? 'stretch' : 'flex-start' }}
    >
      <Animated.View
        style={[
          {
            height: size === 'sm' ? 40 : 50,
            minWidth: size === 'sm' ? 40 : 50,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            paddingHorizontal: size === 'sm' ? spacing.lg : spacing.xl - 2,
            borderRadius: radius.pill,
            backgroundColor: bg,
            opacity: disabled ? 0.4 : 1,
          },
          tap.style,
        ]}
      >
        {loading ? (
          <LoadingSymbol size={size === 'sm' ? 20 : 24} accessibilityLabel="Cargando" />
        ) : (
          <>
            {icon ? <Icon name={icon} size={20} color={fg} /> : null}
            <View>
              <Text
                variant="ui"
                numberOfLines={1}
                style={{
                  color: fg,
                  fontFamily: type.bodyStrong.fontFamily,
                  fontSize: size === 'sm' ? 14 : 16,
                }}
              >
                {title}
              </Text>
            </View>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

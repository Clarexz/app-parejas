import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  /** @deprecated Bitácora: se quita al rediseñar pantallas. Ya no hay cintas de colores. */
  color?: 'yellow' | 'mint' | 'pink';
  /** @deprecated Bitácora: se quita al rediseñar pantallas. Ya nada se inclina. */
  tilt?: number;
};

/** Píldora `surface2`; seleccionada = fondo `ink` y texto `bg` (DISENO §7). */
export function Chip({ label, selected = false, onPress, disabled = false, icon, style }: Props) {
  const { colors, radius, spacing } = useTheme();
  const fg = selected ? colors.bg : colors.ink;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      hitSlop={spacing.sm}
      style={[{ alignSelf: 'flex-start', maxWidth: '100%' }, style]}
    >
      {({ pressed }) => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs + 2,
            backgroundColor: selected ? colors.ink : colors.surface2,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: 6,
            opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
          }}
        >
          {icon ? <Icon name={icon} size={16} color={fg} /> : null}
          <Text
            variant="ui"
            numberOfLines={1}
            style={{ color: fg, fontSize: 14, lineHeight: 20, flexShrink: 1 }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

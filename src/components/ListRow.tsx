import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { Divider } from './Divider';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  label: string;
  icon?: IconName;
  /** Dato a la derecha (p. ej. el apodo actual). */
  value?: string;
  onPress?: () => void;
  /** `destructive` pinta el renglón en Chile (cerrar sesión, arrancar hojas). */
  tone?: 'default' | 'destructive';
  /** Línea punteada debajo; apágala en el último renglón. */
  divider?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

/** Renglón tocable de listas y ajustes: icono + texto Figtree + flecha (DISENO §7). */
export function ListRow({
  label,
  icon,
  value,
  onPress,
  tone = 'default',
  divider = true,
  disabled = false,
  accessibilityHint,
}: Props) {
  const { colors, spacing } = useTheme();
  const destructive = tone === 'destructive';
  const color = disabled ? colors.inkFaint : destructive ? colors.chile : colors.ink;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}, ${value}` : label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        disabled={disabled || !onPress}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.sm,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        {icon ? <Icon name={icon} size={24} color={color} /> : null}
        <Text variant="body" style={{ flex: 1, color }}>
          {label}
        </Text>
        {value ? (
          <Text variant="small" tone="muted" numberOfLines={1} style={{ maxWidth: '40%' }}>
            {value}
          </Text>
        ) : null}
        {destructive ? null : (
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="back" size={20} color={disabled ? colors.inkFaint : colors.inkMuted} />
          </View>
        )}
      </Pressable>
      {divider ? <Divider /> : null}
    </View>
  );
}

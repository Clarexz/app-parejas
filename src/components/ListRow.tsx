import type { ReactNode } from 'react';
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
  /** Reemplaza al dato y al chevrón (un `Toggle`, por ejemplo). */
  right?: ReactNode;
  onPress?: () => void;
  /** `danger` pinta el renglón en Chile (salir de la pareja, borrar). `destructive` es el nombre viejo. */
  tone?: 'default' | 'danger' | 'destructive';
  /** Divisor `line` abajo; apágalo en el último renglón (o usa `ListGroup`). */
  divider?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

/** Renglón de 52 dp: ícono, texto, dato y chevrón (DISENO §7). */
export function ListRow({
  label,
  icon,
  value,
  right,
  onPress,
  tone = 'default',
  divider = true,
  disabled = false,
  accessibilityHint,
}: Props) {
  const { colors, spacing, radius } = useTheme();
  const danger = tone === 'danger' || tone === 'destructive';
  const color = danger ? colors.danger : colors.ink;
  const tappable = !!onPress && !disabled;
  return (
    <View>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={value ? `${label}, ${value}` : label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        disabled={!tappable}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: spacing.sm,
          borderRadius: radius.sm,
          backgroundColor: pressed ? colors.surface : 'transparent',
          opacity: disabled ? 0.4 : 1,
        })}
      >
        {icon ? <Icon name={icon} size={24} color={color} /> : null}
        <Text variant="body" style={{ flex: 1, color }}>
          {label}
        </Text>
        {right ?? (
          <>
            {value ? (
              <Text variant="note" tone="muted" numberOfLines={1} style={{ maxWidth: '40%' }}>
                {value}
              </Text>
            ) : null}
            {danger || !onPress ? null : <Icon name="chevron" size={20} color={colors.inkMuted} />}
          </>
        )}
      </Pressable>
      {divider ? <Divider /> : null}
    </View>
  );
}

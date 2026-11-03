import { useState } from 'react';
import { Platform, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';

import { FieldError } from './FieldError';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  variant?: 'line' | 'multiline';
  error?: string;
  disabled?: boolean;
  /** Ícono a la izquierda (la lupa de una búsqueda). */
  icon?: IconName;
};

// En web el navegador dibuja su propio contorno encima del aro de tu fruta.
const noBrowserOutline = (
  Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : null
) as object | null;

/** Campo `surface`, radio 18; foco = contorno de 2 dp de tu fruta (DISENO §7). */
export function Input({
  label,
  variant = 'line',
  error,
  disabled = false,
  icon,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...rest
}: Props) {
  const { colors, spacing, radius, type, fruit } = useTheme();
  const [focused, setFocused] = useState(false);
  const multiline = variant === 'multiline';
  const outline = error ? colors.danger : focused ? fruit.me.hex : 'transparent';

  return (
    <View style={{ gap: spacing.xs + 2 }}>
      {label ? (
        <Text variant="ui" tone="muted" style={{ fontSize: 14, lineHeight: 20 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 2,
          borderColor: outline,
          opacity: disabled ? 0.5 : 1,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          paddingLeft: icon ? spacing.lg - 2 : 0,
        }}
      >
        {icon ? (
          <View style={{ paddingTop: multiline ? spacing.md : 0 }}>
            <Icon name={icon} size={20} color={colors.inkMuted} />
          </View>
        ) : null}
        <TextInput
          {...rest}
          multiline={multiline}
          editable={!disabled}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled }}
          placeholderTextColor={colors.inkMuted}
          selectionColor={fruit.me.hex}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            type.body,
            noBrowserOutline,
            {
              flex: 1,
              color: colors.ink,
              paddingLeft: icon ? spacing.sm : spacing.lg - 2,
              paddingRight: spacing.lg - 2,
              paddingVertical: multiline ? spacing.md : spacing.sm,
              minHeight: multiline ? 104 : 52,
            },
            multiline && { textAlignVertical: 'top' },
          ]}
        />
      </View>
      {error ? <FieldError>{error}</FieldError> : null}
    </View>
  );
}

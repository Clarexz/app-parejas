import { useRef, useState, type ComponentRef } from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

import { FieldError } from './FieldError';
import { Text } from './Text';

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

/** Mayúsculas, sin espacios ni guiones, solo el alfabeto del código y máximo 6 caracteres. */
export function normalizeCode(text: string): string {
  let out = '';
  for (const ch of text.toLocaleUpperCase('es-MX')) {
    if (CODE_ALPHABET.includes(ch)) out += ch;
    if (out.length === CODE_LENGTH) break;
  }
  return out;
}

type Props = {
  value: string;
  onChangeText: (code: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

/**
 * Código de invitación en 6 casillas (DISENO §7). Una sola `TextInput` transparente cubre las
 * casillas: el teclado, el pegado y la accesibilidad funcionan como un campo normal.
 */
export function CodeInput({ value, onChangeText, error, disabled = false, autoFocus }: Props) {
  const { colors, spacing, radius, type, fonts, fruit } = useTheme();
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const code = normalizeCode(value);
  const active = Math.min(code.length, CODE_LENGTH - 1);

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ opacity: disabled ? 0.5 : 1 }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
        >
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const isActive = focused && !disabled && i === active;
            const border = error ? colors.danger : isActive ? fruit.me.hex : 'transparent';
            return (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginRight: i === 2 ? spacing.md : 0,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 60,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.surface,
                    borderWidth: 2,
                    borderColor: border,
                    borderRadius: radius.md,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.display,
                      fontSize: type.h2.fontSize,
                      lineHeight: type.h2.lineHeight,
                      color: colors.ink,
                    }}
                  >
                    {code[i] ?? ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        <TextInput
          ref={ref}
          value={code}
          onChangeText={(t) => onChangeText(normalizeCode(t))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!disabled}
          autoFocus={autoFocus}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          maxLength={CODE_LENGTH * 2}
          caretHidden
          selectionColor={fruit.me.hex}
          accessibilityLabel="Código de invitación"
          accessibilityHint="Seis caracteres, letras y números"
          accessibilityState={{ disabled }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.02,
            color: colors.bg,
          }}
        />
      </View>
      {error ? <FieldError>{error}</FieldError> : null}
    </View>
  );
}

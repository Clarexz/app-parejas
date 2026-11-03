import { useRef, useState, type ComponentRef } from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

import { FieldError } from './FieldError';
import { Text } from './Text';

export type DateParts = { day: string; month: string; year: string };

type Props = {
  label?: string;
  value: DateParts;
  onChange: (parts: DateParts) => void;
  error?: string;
  disabled?: boolean;
};

type Part = keyof DateParts;

const PARTS: { key: Part; length: number; placeholder: string; a11y: string; width: number }[] = [
  { key: 'day', length: 2, placeholder: 'DD', a11y: 'Día', width: 56 },
  { key: 'month', length: 2, placeholder: 'MM', a11y: 'Mes', width: 56 },
  { key: 'year', length: 4, placeholder: 'AAAA', a11y: 'Año', width: 88 },
];

/** Deja solo dígitos y recorta al largo de la casilla. */
export function digitsOnly(text: string, max: number): string {
  return text.replace(/\D/g, '').slice(0, max);
}

/**
 * Fecha como sello de fechador con tres casillas DD / MM / AAAA (DISENO §7). Solo captura
 * dígitos y salta el foco al llenar día y mes; no valida (eso vive en la lógica pura).
 */
export function DateField({ label, value, onChange, error, disabled = false }: Props) {
  const { colors, spacing, radius, type, fonts, fruit } = useTheme();
  const refs = useRef<Record<Part, ComponentRef<typeof TextInput> | null>>({
    day: null,
    month: null,
    year: null,
  });
  const [focused, setFocused] = useState<Part | null>(null);

  const change = (key: Part, length: number, text: string) => {
    const next = digitsOnly(text, length);
    onChange({ ...value, [key]: next });
    if (next.length === length) {
      if (key === 'day') refs.current.month?.focus();
      if (key === 'month') refs.current.year?.focus();
    }
  };

  const back = (key: Part) => {
    if (value[key] !== '') return;
    if (key === 'month') refs.current.day?.focus();
    if (key === 'year') refs.current.month?.focus();
  };

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text variant="ui" tone="muted" style={{ fontSize: 14, lineHeight: 20 }}>
          {label}
        </Text>
      ) : null}
      <View
        accessibilityRole="none"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {PARTS.map((part, i) => {
          const isFocused = focused === part.key;
          const border = error ? colors.danger : isFocused ? fruit.me.hex : 'transparent';
          return (
            <View key={part.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                ref={(el) => {
                  refs.current[part.key] = el;
                }}
                value={value[part.key]}
                onChangeText={(t) => change(part.key, part.length, t)}
                onFocus={() => setFocused(part.key)}
                onBlur={() => setFocused((f) => (f === part.key ? null : f))}
                onKeyPress={(e) => {
                  if (e.nativeEvent.key === 'Backspace') back(part.key);
                }}
                editable={!disabled}
                keyboardType="number-pad"
                maxLength={part.length}
                placeholder={part.placeholder}
                placeholderTextColor={colors.inkMuted}
                selectionColor={fruit.me.hex}
                accessibilityLabel={part.a11y}
                accessibilityState={{ disabled }}
                textAlign="center"
                style={[
                  type.h3,
                  {
                    fontFamily: fonts.display,
                    width: part.width,
                    minHeight: 52,
                    color: colors.ink,
                    backgroundColor: colors.surface,
                    borderWidth: 2,
                    borderColor: border,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: 0,
                    textAlign: 'center',
                  },
                ]}
              />
              {i < PARTS.length - 1 ? (
                <Text variant="h3" tone="muted" style={{ marginLeft: spacing.sm }}>
                  /
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
      {error ? <FieldError>{error}</FieldError> : null}
    </View>
  );
}

import { useState } from 'react';
import { TextInput, View, type LayoutChangeEvent, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

const MIN_LINES = 4;

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  variant?: 'line' | 'multiline';
  error?: string;
  disabled?: boolean;
};

/** Renglón para escribir (DISENO §7): `line` es un renglón; `multiline`, una ficha con renglones. */
export function Input({
  label,
  variant = 'line',
  error,
  disabled = false,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...rest
}: Props) {
  const { colors, spacing, radius, type } = useTheme();
  const ruleStep = type.body.lineHeight;
  const [focused, setFocused] = useState(false);
  const [height, setHeight] = useState(ruleStep * MIN_LINES);
  const multiline = variant === 'multiline';

  const lineColor = error ? colors.chile : focused ? colors.jamaica : colors.ink;
  const lineWidth = error || !focused ? 1.5 : 2;

  const input = (
    <TextInput
      {...rest}
      multiline={multiline}
      editable={!disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      placeholderTextColor={colors.inkFaint}
      selectionColor={colors.jamaica}
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
        {
          color: disabled ? colors.inkFaint : colors.ink,
          paddingHorizontal: multiline ? spacing.md : 0,
          paddingVertical: multiline ? 0 : spacing.sm,
          minHeight: multiline ? ruleStep * MIN_LINES : 44,
        },
        multiline && { lineHeight: ruleStep, textAlignVertical: 'top' },
      ]}
    />
  );

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text variant="hand" tone="muted">
          {label}
        </Text>
      ) : null}
      {multiline ? (
        <View
          onLayout={(e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height)}
          style={{
            backgroundColor: colors.paperRaised,
            borderRadius: radius.none,
            borderTopWidth: 2,
            borderTopColor: error ? colors.chile : focused ? colors.jamaica : colors.margin,
            borderBottomWidth: lineWidth,
            borderBottomColor: lineColor,
            opacity: disabled ? 0.7 : 1,
          }}
        >
          {Array.from(
            { length: Math.max(MIN_LINES, Math.floor(height / ruleStep)) - 1 },
            (_, i) => (
              <View
                key={i}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: ruleStep * (i + 1) - 4,
                  height: 1,
                  backgroundColor: colors.ruled,
                }}
              />
            ),
          )}
          {input}
        </View>
      ) : (
        <View
          style={{
            borderBottomWidth: lineWidth,
            borderBottomColor: lineColor,
            marginBottom: 2 - lineWidth,
            opacity: disabled ? 0.7 : 1,
          }}
        >
          {input}
        </View>
      )}
      {error ? (
        <Text variant="small" tone="chile" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

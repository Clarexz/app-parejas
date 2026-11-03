import { Text as RNText, type TextProps } from 'react-native';

import { useTheme, type TypeVariant } from '@/theme';

export type TextTone = 'ink' | 'muted' | 'danger' | 'success' | 'onFruit';

type Props = TextProps & {
  variant?: TypeVariant;
  tone?: TextTone;
  /** Alias de `tone="muted"`. */
  muted?: boolean;
};

/** Texto con la escala de DISENO §2.4. `onFruit` = el texto de tu fruta (Tinta u Hueso). */
export function Text({
  variant = 'body',
  tone,
  muted,
  style,
  maxFontSizeMultiplier,
  ...rest
}: Props) {
  const { colors, type, fruit } = useTheme();
  const resolved: TextTone = tone ?? (muted ? 'muted' : 'ink');
  const color = {
    ink: colors.ink,
    muted: colors.inkMuted,
    danger: colors.danger,
    success: colors.success,
    onFruit: fruit.me.on,
  }[resolved];
  // Los números grandes no deben desbordar su tarjeta con la fuente del sistema muy grande.
  const capped = variant === 'display' || variant === 'h1' ? 1.4 : undefined;
  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? capped}
      style={[type[variant], { color }, style]}
    />
  );
}

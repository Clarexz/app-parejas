import { Text as RNText, type TextProps } from 'react-native';

import { useTheme, type TypeVariant } from '@/theme';

export type TextTone = 'ink' | 'muted' | 'faint' | 'jamaica' | 'chile' | 'nopal';

type Props = TextProps & {
  variant?: TypeVariant;
  tone?: TextTone;
  /** Alias de `tone="muted"`. */
  muted?: boolean;
};

export function Text({
  variant = 'body',
  tone,
  muted,
  style,
  maxFontSizeMultiplier,
  ...rest
}: Props) {
  const { colors, type } = useTheme();
  const resolved: TextTone = tone ?? (muted ? 'muted' : 'ink');
  const color = {
    ink: colors.ink,
    muted: colors.inkMuted,
    faint: colors.inkFaint,
    jamaica: colors.jamaica,
    chile: colors.chile,
    nopal: colors.nopal,
  }[resolved];
  const capped = variant === 'hero' || variant === 'display' ? 1.4 : undefined;
  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? capped}
      style={[type[variant], { color }, style]}
    />
  );
}

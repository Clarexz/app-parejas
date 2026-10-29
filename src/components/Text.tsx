import { Text as RNText, type TextProps } from 'react-native';

import { useTheme } from '@/theme';

type Props = TextProps & { variant?: 'title' | 'body' | 'caption'; muted?: boolean };

export function Text({ variant = 'body', muted, style, ...rest }: Props) {
  const { colors, typography } = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        {
          fontSize: typography[variant],
          fontWeight: variant === 'title' ? '700' : '400',
          color: muted || variant === 'caption' ? colors.textMuted : colors.text,
        },
        style,
      ]}
    />
  );
}

import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading }: Props) {
  const { colors, spacing, radius } = useTheme();
  const primary = variant === 'primary';
  const inactive = disabled || loading;
  const fg = primary ? colors.onJamaica : colors.jamaica;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: primary ? colors.jamaica : 'transparent',
          borderColor: primary ? colors.jamaica : colors.ink,
          borderRadius: radius.sm,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          opacity: inactive ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text variant="bodyStrong" style={{ color: fg }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, minHeight: 48 },
});

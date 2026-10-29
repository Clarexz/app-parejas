import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

export function Card({ children }: { children: ReactNode }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      {children}
    </View>
  );
}

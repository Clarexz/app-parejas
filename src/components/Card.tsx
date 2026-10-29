import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

// Versión mínima sobre los tokens nuevos; se rediseña en otro encargo.
export function Card({ children }: { children: ReactNode }) {
  const { colors, spacing, radius, shadows } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.paperRaised,
        borderTopColor: colors.margin,
        borderTopWidth: 2,
        borderRadius: radius.none,
        padding: spacing.lg,
        gap: spacing.sm,
        boxShadow: shadows.object,
      }}
    >
      {children}
    </View>
  );
}

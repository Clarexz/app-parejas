import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export function Screen({ children }: { children: ReactNode }) {
  const { colors, spacing } = useTheme();
  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background, padding: spacing.md }]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

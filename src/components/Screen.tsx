import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { Paper, type PaperVariant } from './Paper';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  paper?: PaperVariant;
  /** Con `scroll`: activa el "jalar para refrescar" (DISENO §7). */
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Contenedor de pantalla: hoja + safe area + gutters de la página (DISENO §2.3). */
export function Screen({
  children,
  scroll = false,
  paper = 'notebook',
  refreshing = false,
  onRefresh,
}: Props) {
  const { colors, page, spacing } = useTheme();
  const padding = {
    paddingLeft: page.contentLeft,
    paddingRight: page.contentRight,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  };
  return (
    <View style={[styles.root, { backgroundColor: colors.paper }]}>
      <Paper variant={paper} />
      <SafeAreaView style={styles.root}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={padding}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.jamaica}
                  colors={[colors.jamaica]}
                  progressBackgroundColor={colors.paperRaised}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.root, padding]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

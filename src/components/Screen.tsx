import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  /** Gutter de 20 dp a los lados (por defecto sí). Sin él, el contenido llega al borde. */
  padded?: boolean;
  /** Con `scroll`: activa el "jalar para refrescar" (DISENO §7). */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** @deprecated Bitácora: se quita al rediseñar pantallas. Ya no hay hoja de cuaderno. */
  paper?: string;
};

/** Contenedor de pantalla: fondo `bg`, safe area y gutter de 20 dp (DISENO §7). */
export function Screen({
  children,
  scroll = false,
  padded = true,
  refreshing = false,
  onRefresh,
}: Props) {
  const { colors, page, spacing, fruit } = useTheme();
  const padding = {
    paddingHorizontal: padded ? page.gutter : 0,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  };
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
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
                  tintColor={fruit.me.hex}
                  colors={[fruit.me.hex]}
                  progressBackgroundColor={colors.surface}
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

import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

export type PaperVariant = 'notebook' | 'plain' | 'ruled';

/**
 * @deprecated Bitácora: se quita al rediseñar pantallas. Ya no hay hoja de cuaderno: solo el
 * fondo `bg`.
 */
export function Paper(_props: { variant?: PaperVariant }) {
  const { colors } = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
  );
}

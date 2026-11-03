import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  style?: StyleProp<ViewStyle>;
  /** @deprecated Bitácora: se quita al rediseñar pantallas. Siempre es una línea continua. */
  variant?: 'dashed' | 'solid';
};

/** Divisor de 1 dp en `line` (DISENO §2.1). */
export function Divider({ style }: Props) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="none"
      importantForAccessibility="no-hide-descendants"
      style={[{ height: 1, alignSelf: 'stretch', backgroundColor: colors.line }, style]}
    />
  );
}

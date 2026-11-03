import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  style?: StyleProp<ViewStyle>;
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

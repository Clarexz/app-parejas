import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

/** Error de un campo: ícono + texto en `danger`, nunca solo color (DISENO §2.3). */
export function FieldError({ children }: { children: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}
    >
      <Icon name="alert" size={16} color={colors.danger} />
      <Text variant="note" tone="danger" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

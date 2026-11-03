import { View } from 'react-native';

import { Text, Wordmark } from '@/components';
import { useTheme } from '@/theme';

/** Marca de las pantallas de entrada: wordmark apilado y la frase de la marca (DISENO §6). */
export function AuthBrand() {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg }}>
      <Wordmark layout="stacked" size={40} />
      <Text variant="ui" tone="muted" style={{ textAlign: 'center' }}>
        Falta menos de lo que parece.
      </Text>
    </View>
  );
}

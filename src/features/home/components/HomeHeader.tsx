import { View } from 'react-native';

import { BrandSymbol, Text, Wordmark } from '@/components';
import { useTheme } from '@/theme';

/** Encabezado de Inicio: símbolo + nombre a la izquierda, la fecha corta a la derecha. */
export function HomeHeader({ date }: { date: string }) {
  const { spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <BrandSymbol size={30} />
        <Wordmark size={26} layout="name" />
      </View>
      <Text variant="note" tone="muted">
        {date}
      </Text>
    </View>
  );
}

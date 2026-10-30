import { View } from 'react-native';

import { Screen, Text } from '@/components';
import { useCouple } from '@/features/couple';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const { spacing } = useTheme();
  const { me, partner } = useCouple();
  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display">Inicio</Text>
        <Text variant="body">
          Ustedes: {me?.display_name ?? 'tú'} y {partner?.display_name ?? 'tu pareja'}
        </Text>
      </View>
    </Screen>
  );
}

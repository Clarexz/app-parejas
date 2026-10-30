import { View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { useOnboardingStage } from '@/features/onboarding';
import { useTheme } from '@/theme';

export default function ErrorScreen() {
  const { spacing } = useTheme();
  const { retry } = useOnboardingStage();
  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display">Sin señal</Text>
        <Text variant="body">
          No hay señal con el servidor. Revisa tu internet y vuelve a intentar.
        </Text>
        <Button title="Reintentar" onPress={retry} />
      </View>
    </Screen>
  );
}

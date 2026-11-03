import { View } from 'react-native';

import { EmptyState, Screen } from '@/components';
import { useOnboardingStage } from '@/features/onboarding';

export default function ErrorScreen() {
  const { retry } = useOnboardingStage();
  return (
    <Screen scroll>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          art="circles"
          title="Sin señal"
          body="Tu celular está sin señal. Revisa tu internet y vuelve a intentar."
          action={{ label: 'Reintentar', onPress: retry }}
        />
      </View>
    </Screen>
  );
}

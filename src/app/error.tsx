import { View } from 'react-native';

import { CloudOff, EmptyState, Screen } from '@/components';
import { useOnboardingStage } from '@/features/onboarding';

export default function ErrorScreen() {
  const { retry } = useOnboardingStage();
  return (
    <Screen scroll>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          illustration={<CloudOff />}
          title="Sin señal"
          body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
          actionLabel="Reintentar"
          onAction={retry}
        />
      </View>
    </Screen>
  );
}

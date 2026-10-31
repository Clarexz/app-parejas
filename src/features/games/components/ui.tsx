import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { CloudOff, EmptyState, IconButton, LoadingLines, Screen } from '@/components';
import { errorMessage } from '@/lib/errors';
import { useTheme } from '@/theme';

/** Volver; si se entró por un aviso (sin historial) cae en el hub de juegos. */
export function useGoBack() {
  const router = useRouter();
  return () => {
    if (router.canGoBack?.() ?? true) router.back();
    else router.replace('/games');
  };
}

export function BackBar() {
  const { spacing } = useTheme();
  const goBack = useGoBack();
  return (
    <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
      <IconButton name="back" accessibilityLabel="Volver" onPress={goBack} />
    </View>
  );
}

/** ¿El error es "ya no existe" (clave estable del servidor)? */
export function isGone(error: unknown, key: 'round_not_found' | 'drawing_not_found'): boolean {
  return errorMessage(error) === errorMessage({ message: key });
}

export function LoadingPage({ label }: { label: string }) {
  return (
    <Screen>
      <BackBar />
      <LoadingLines count={5} accessibilityLabel={label} />
    </Screen>
  );
}

export function ErrorPage({
  error,
  gone,
  goneTitle,
  loadTitle,
  onRetry,
}: {
  error: unknown;
  gone: boolean;
  goneTitle: string;
  loadTitle: string;
  onRetry: () => void;
}) {
  const goBack = useGoBack();
  return (
    <Screen>
      <BackBar />
      {gone ? (
        <EmptyState
          illustration={<CloudOff />}
          title={goneTitle}
          body={errorMessage(error)}
          actionLabel="Ir a Juegos"
          onAction={goBack}
        />
      ) : (
        <EmptyState
          illustration={<CloudOff />}
          title={loadTitle}
          body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
          actionLabel="Reintentar"
          onAction={onRetry}
        />
      )}
    </Screen>
  );
}

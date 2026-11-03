import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { EmptyState, Icon, LoadingSymbol, Screen, Text } from '@/components';
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Atrás"
      onPress={goBack}
      hitSlop={spacing.sm}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginLeft: -spacing.xs,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name="back" size={24} />
      <Text variant="ui">Atrás</Text>
    </Pressable>
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSymbol accessibilityLabel={label} />
      </View>
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
          art="bubble"
          title={goneTitle}
          body={errorMessage(error)}
          action={{ label: 'Ir a Juegos', onPress: goBack }}
        />
      ) : (
        <EmptyState
          art="circles"
          title={loadTitle}
          body="No pudimos conectarnos. Revisa tu internet y vuelve a intentar."
          action={{ label: 'Reintentar', onPress: onRetry }}
        />
      )}
    </Screen>
  );
}

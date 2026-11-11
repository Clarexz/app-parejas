import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';

import { ThemeProvider, useTheme } from '@/theme';

import { Button } from './Button';
import { EmptyState } from './EmptyState';

type Props = {
  error: unknown;
  /** Vuelve a pintar la pantalla que falló. */
  onRetry: () => void;
  /** Lleva a Inicio (la ruta `/` decide a dónde según la sesión). */
  onGoHome: () => void;
};

function Content({ error, onRetry, onGoHome }: Props) {
  const { colors, page, spacing } = useTheme();

  useEffect(() => {
    // No hay Sentry: al menos queda en el log del dispositivo.
    console.error('Error de pantalla:', error);
  }, [error]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: page.gutter,
          paddingVertical: spacing.xl,
        }}
      >
        <EmptyState
          art="circles"
          title="Algo se rompió"
          body="Fue cosa nuestra, no tuya. Intenta de nuevo; si sigue igual, vuelve a Inicio."
          action={{ label: 'Volver a intentar', onPress: onRetry }}
        />
        <View style={{ alignItems: 'center' }}>
          <Button title="Ir a Inicio" variant="ghost" onPress={onGoHome} />
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Pantalla de último recurso para el `ErrorBoundary` de expo-router. Lleva su propio tema porque
 * si falla el layout raíz el `ThemeProvider` de la app ya no está montado.
 */
export function ErrorFallback(props: Props) {
  return (
    <ThemeProvider>
      <Content {...props} />
    </ThemeProvider>
  );
}

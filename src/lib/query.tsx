import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Application from 'expo-application';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { retryDelay, shouldPersistQuery, shouldRetry } from './queryPolicy';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Lo guardado en disco se descarta pasados 7 días. */
const PERSIST_MAX_AGE_MS = 7 * DAY_MS;

/**
 * Cliente único de la app (también lo usa `signOut` para limpiar la caché).
 * `offlineFirst`: con caché se ve sin red y la consulta se reintenta al haber conexión.
 * `gcTime` de 24 h para que lo guardado en disco no se pierda en memoria entre pantallas.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      retryDelay,
      staleTime: 30_000,
      gcTime: DAY_MS,
      networkMode: 'offlineFirst',
      refetchOnReconnect: true,
    },
    // Una escritura que falla no se repite sola: la persona decide si reintenta.
    mutations: { retry: false },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ahorita-query-cache',
});

/** Al actualizar la app se descarta la caché guardada (el formato de los datos pudo cambiar). */
const buster = Application.nativeApplicationVersion ?? 'dev';

// Al volver a primer plano se refrescan las consultas viejas (no hay NetInfo instalado).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
}

/** Vacía la caché en memoria y la guardada en disco (cerrar sesión). */
export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  await persister.removeClient();
}

/** Tope de espera de la lectura del disco; pasado, la app arranca sin caché. */
const RESTORE_TIMEOUT_MS = 3000;

export function QueryProvider({ children }: { children: ReactNode }) {
  // No se pinta nada hasta restaurar la caché: si las rutas se resuelven con consultas todavía
  // "restaurando", las guardas redirigen a Inicio y se pierde el destino (p. ej. un aviso).
  // Mientras, sigue el splash de la app.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setRestored(true), RESTORE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);
  const done = () => setRestored(true);
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE_MS,
        buster,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
      onSuccess={done}
      onError={done}
    >
      {restored ? children : null}
    </PersistQueryClientProvider>
  );
}

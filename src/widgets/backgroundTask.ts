// Push de datos -> widgets. expo-notifications ejecuta esta tarea con CADA mensaje FCM recibido
// (también con la app cerrada). Debe definirse y registrarse en el scope del módulo, y este
// módulo se importa desde index.ts. Solo Android.
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { fetchSnapshot } from './fetchSnapshot';
import { saveAndRefresh } from './update';

export const WIDGET_NOTIFICATION_TASK = 'widget-notification-task';
export const MIN_FETCH_INTERVAL_MS = 20_000;

let lastFetchAt = 0;

/** Lectura + redibujo con throttle en memoria. Nunca lanza. */
export async function syncWidgetsFromServer(now = Date.now()): Promise<void> {
  if (now - lastFetchAt < MIN_FETCH_INTERVAL_MS) return;
  lastFetchAt = now;
  try {
    const snapshot = await fetchSnapshot();
    if (snapshot) await saveAndRefresh(snapshot);
  } catch {
    // best effort
  }
}

/** Solo para pruebas. */
export function resetThrottle(): void {
  lastFetchAt = 0;
}

export async function widgetNotificationTask({ data }: { data?: unknown }): Promise<void> {
  try {
    // Un toque en una acción de la notificación no trae datos nuevos.
    if (data && typeof data === 'object' && 'actionIdentifier' in data) return;
    await syncWidgetsFromServer();
  } catch {
    // best effort
  }
}

if (Platform.OS === 'android') {
  try {
    TaskManager.defineTask<Notifications.NotificationTaskPayload>(
      WIDGET_NOTIFICATION_TASK,
      async ({ data }) => {
        await widgetNotificationTask({ data });
      },
    );
    void Notifications.registerTaskAsync(WIDGET_NOTIFICATION_TASK).catch(() => {});
  } catch {
    // best effort
  }
}

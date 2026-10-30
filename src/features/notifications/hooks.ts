import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { create } from 'zustand';

import { useSession } from '@/features/auth';
import { useCouple } from '@/features/couple';
import { questionKeys, useDailyQuestion } from '@/features/questions';
import {
  DEFAULT_PREFS,
  notificationKind,
  routeForNotification,
  type NotificationPrefs,
} from '@/lib/notifications';
import { cardState } from '@/lib/questions';

import {
  fetchNotificationPrefs,
  registerPushToken,
  sendTestNotification,
  upsertNotificationPrefs,
} from './api';
import {
  ensureChannels,
  getDeviceToken,
  getPermission,
  installForegroundHandler,
  onTokenChange,
  requestPermission,
  syncReminders,
  cancelReminders,
  isPushSupported,
  type PushPermission,
  type PushStatus,
} from './push';

export type { NotificationPrefs };

// ---------------------------------------------------------------------------
// Preferencias
// ---------------------------------------------------------------------------

const prefsKey = (userId: string | null) => ['notification-prefs', userId] as const;

export function useNotificationPrefs() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const query = useQuery({
    queryKey: prefsKey(userId),
    queryFn: () => fetchNotificationPrefs(userId as string),
    enabled: !!userId,
  });
  return {
    prefs: query.data ?? DEFAULT_PREFS,
    isLoading: !!userId && query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useUpdateNotificationPrefs() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (partial: Partial<NotificationPrefs>) =>
      upsertNotificationPrefs(userId as string, partial),
    onMutate: async (partial) => {
      await qc.cancelQueries({ queryKey: prefsKey(userId) });
      const previous = qc.getQueryData<NotificationPrefs>(prefsKey(userId));
      qc.setQueryData<NotificationPrefs>(prefsKey(userId), {
        ...(previous ?? DEFAULT_PREFS),
        ...partial,
      });
      return { previous };
    },
    onError: (_e, _partial, ctx) => {
      if (ctx?.previous) qc.setQueryData(prefsKey(userId), ctx.previous);
      else void qc.invalidateQueries({ queryKey: prefsKey(userId) });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: prefsKey(userId) }),
  });
}

// ---------------------------------------------------------------------------
// Permiso
// ---------------------------------------------------------------------------

type PermissionStore = PushPermission & { set: (p: PushPermission) => void };

/** Estado compartido entre `usePushPermission` y el puente (que registra el token al conceder). */
const usePermissionStore = create<PermissionStore>((set) => ({
  status: isPushSupported ? 'undetermined' : 'unavailable',
  canAskAgain: isPushSupported,
  set: (p) => set(p),
}));

async function refreshPermission(): Promise<PushPermission> {
  const p = await getPermission();
  usePermissionStore.getState().set(p);
  return p;
}

let registeredKey: string | null = null;

/** Registra el token de este celular (una vez por usuario+token; best effort). */
async function registerCurrentToken(userId: string, token?: string | null): Promise<void> {
  const t = token ?? (await getDeviceToken());
  if (!t) return;
  const key = `${userId}:${t}`;
  if (registeredKey === key) return;
  try {
    await registerPushToken(t);
    registeredKey = key;
  } catch {
    // se reintenta la próxima vez
  }
}

export function usePushPermission() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const status = usePermissionStore((s) => s.status);
  const canAskAgain = usePermissionStore((s) => s.canAskAgain);

  const refresh = useCallback(() => {
    void refreshPermission();
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const request = useCallback(async (): Promise<PushStatus> => {
    const p = await requestPermission();
    usePermissionStore.getState().set(p);
    if (p.status === 'granted' && userId) await registerCurrentToken(userId);
    return p.status;
  }, [userId]);

  const openSettings = useCallback(() => {
    void Linking.openSettings().catch(() => {});
  }, []);

  return { status, canAskAgain, request, openSettings, refresh };
}

export function useSendTestNotification() {
  return useMutation({ mutationFn: sendTestNotification });
}

// ---------------------------------------------------------------------------
// Aviso previo ("soft ask")
// ---------------------------------------------------------------------------

const SOFT_ASK_KEY = 'push-soft-ask-dismissed';

export function usePushSoftAsk() {
  const { status, canAskAgain, request } = usePushPermission();
  // null = aún no se sabe si se descartó antes (no se muestra mientras tanto).
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let value = false;
      try {
        value = (await AsyncStorage.getItem(SOFT_ASK_KEY)) === '1';
      } catch {
        // sin almacenamiento: se trata como no descartado
      }
      if (!cancelled) setDismissed(value);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    void (async () => {
      try {
        await AsyncStorage.setItem(SOFT_ASK_KEY, '1');
      } catch {
        // solo se pierde la preferencia entre sesiones
      }
    })();
  }, []);

  const accept = useCallback(async () => {
    await request();
  }, [request]);

  const visible =
    dismissed === false && (status === 'undetermined' || (status === 'denied' && canAskAgain));
  return { visible, accept, dismiss };
}

// ---------------------------------------------------------------------------
// Puente (se monta UNA vez, sin UI)
// ---------------------------------------------------------------------------

if (isPushSupported) installForegroundHandler();

/** Respuestas ya atendidas (sobrevive a remontajes del puente). */
let handledResponseKey: string | null = null;

function responseKey(r: Notifications.NotificationResponse): string {
  return `${r.notification.request.identifier}:${r.notification.date}:${r.actionIdentifier}`;
}

export function NotificationsBridge(): null {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { couple, partner } = useCouple();
  const coupleId = couple?.id ?? null;
  const { prefs } = useNotificationPrefs();
  const { card, isLoading: cardLoading, day } = useDailyQuestion();
  const status = usePermissionStore((s) => s.status);
  const [activeTick, setActiveTick] = useState(0);

  // Canales y permiso (se vuelve a leer al volver a primer plano).
  useEffect(() => {
    if (!isPushSupported) return;
    void ensureChannels();
    void refreshPermission();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void refreshPermission();
        setActiveTick((n) => n + 1);
      }
    });
    return () => sub.remove();
  }, []);

  // Token: al haber permiso y cuando FCM lo rota.
  useEffect(() => {
    if (!isPushSupported || status !== 'granted' || !userId) return;
    void registerCurrentToken(userId);
    return onTokenChange((token) => void registerCurrentToken(userId, token));
  }, [status, userId]);

  // Push en primer plano: refresca lo que cambió (el banner lo suprime el handler).
  useEffect(() => {
    if (!isPushSupported) return;
    const sub = Notifications.addNotificationReceivedListener((n) => {
      invalidateFor(qc, coupleId, notificationKind(n.request.content.data));
    });
    return () => sub.remove();
  }, [qc, coupleId]);

  // Toque en una notificación. `useLastNotificationResponse` cubre el arranque en frío (la
  // respuesta ya existe cuando se monta el puente, que solo vive con la sesión lista y la pareja
  // resuelta, así que las rutas protegidas ya están disponibles) y los toques con la app viva.
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!isPushSupported || !response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const key = responseKey(response);
    if (handledResponseKey === key) return;
    handledResponseKey = key;
    // Se olvida para que el siguiente arranque en frío no vuelva a abrir la misma pantalla.
    void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    const data = response.notification.request.content.data;
    invalidateFor(qc, coupleId, notificationKind(data));
    const route = routeForNotification(data);
    if (route) router.push(route as Href);
  }, [response, router, qc, coupleId]);

  // Recordatorio local.
  const answeredToday = card ? cardState(card) !== 'unanswered' : false;
  const partnerName = partner?.nickname || partner?.display_name || null;
  const waitingForCard = !!coupleId && cardLoading;
  useEffect(() => {
    if (!isPushSupported || waitingForCard) return;
    if (status !== 'granted' || !prefs.reminderEnabled) {
      if (status !== 'undetermined') void cancelReminders();
      return;
    }
    void syncReminders({ time: prefs.reminderTime, answeredToday, partnerName });
  }, [
    status,
    prefs.reminderEnabled,
    prefs.reminderTime,
    answeredToday,
    partnerName,
    day,
    waitingForCard,
    activeTick,
  ]);

  return null;
}

function invalidateFor(
  qc: ReturnType<typeof useQueryClient>,
  coupleId: string | null,
  kind: string | null,
) {
  const keys: (readonly unknown[])[] = [];
  if (kind === 'answer' || kind === 'comment') {
    keys.push(
      questionKeys.dailyAll(coupleId),
      questionKeys.questionAll(coupleId),
      questionKeys.commentsAll(coupleId),
      questionKeys.historyAll(coupleId),
      questionKeys.streak(coupleId),
    );
  } else if (kind === 'mood') {
    keys.push(['moods', coupleId]);
  }
  for (const queryKey of keys) void qc.invalidateQueries({ queryKey });
}

// Envoltorio de expo-notifications. En web (y cualquier plataforma que no sea Android) todo es
// no-op: la app solo tiene push en Android.
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import {
  CHANNELS,
  REMINDER_CHANNEL,
  REMINDER_ID_PREFIX,
  reminderDates,
  reminderId,
  shortName,
  shouldShowInForeground,
} from '@/lib/notifications';
import { reminderCopy } from '@/lib/reminderCopy';

export type PushStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';
export type PushPermission = { status: PushStatus; canAskAgain: boolean };

const UNAVAILABLE: PushPermission = { status: 'unavailable', canAskAgain: false };

export const isPushSupported = Platform.OS === 'android';

function toPermission(r: { status: string; canAskAgain: boolean }): PushPermission {
  const status: PushStatus =
    r.status === 'granted' ? 'granted' : r.status === 'denied' ? 'denied' : 'undetermined';
  return { status, canAskAgain: r.canAskAgain };
}

let channelsPromise: Promise<void> | null = null;

/** Crea los canales (Android 13+ exige que existan antes de pedir el permiso). */
export function ensureChannels(): Promise<void> {
  if (!isPushSupported) return Promise.resolve();
  channelsPromise ??= (async () => {
    try {
      for (const c of CHANNELS) {
        await Notifications.setNotificationChannelAsync(c.id, {
          name: c.name,
          description: c.description,
          importance: c.importance === 'high' ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
        });
      }
    } catch {
      channelsPromise = null; // se reintenta en la siguiente llamada
    }
  })();
  return channelsPromise;
}

/** Banner en primer plano solo para pruebas; lo demás ya se avisa con toasts. */
export function installForegroundHandler(): void {
  if (!isPushSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const show = shouldShowInForeground(notification.request.content.data);
      return {
        shouldShowBanner: show,
        shouldShowList: show,
        shouldPlaySound: show,
        shouldSetBadge: false,
      };
    },
  });
}

export async function getPermission(): Promise<PushPermission> {
  if (!isPushSupported) return UNAVAILABLE;
  try {
    return toPermission(await Notifications.getPermissionsAsync());
  } catch {
    return UNAVAILABLE;
  }
}

export async function requestPermission(): Promise<PushPermission> {
  if (!isPushSupported) return UNAVAILABLE;
  try {
    await ensureChannels();
    return toPermission(await Notifications.requestPermissionsAsync());
  } catch {
    return getPermission();
  }
}

/** Token FCM de este celular, o null (sin google-services.json o sin Google Play no hay token). */
export async function getDeviceToken(): Promise<string | null> {
  if (!isPushSupported) return null;
  try {
    const t = await Notifications.getDevicePushTokenAsync();
    return typeof t.data === 'string' && t.data ? t.data : null;
  } catch {
    return null;
  }
}

export function onTokenChange(listener: (token: string) => void): () => void {
  if (!isPushSupported) return () => {};
  const sub = Notifications.addPushTokenListener((t) => {
    if (typeof t.data === 'string' && t.data) listener(t.data);
  });
  return () => sub.remove();
}

// ---------------------------------------------------------------------------
// Recordatorio local
// ---------------------------------------------------------------------------

async function cancelReminderIds(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith(REMINDER_ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

// Las operaciones se encadenan para que dos sincronizaciones seguidas no se pisen.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
}

/** Cancela solo los recordatorios locales (`reminder-*`). */
export function cancelReminders(): Promise<void> {
  if (!isPushSupported) return Promise.resolve();
  return enqueue(cancelReminderIds).catch(() => {});
}

/** Reprograma los próximos recordatorios (cancela los anteriores). */
export function syncReminders(input: {
  time: string;
  answeredToday: boolean;
  partnerName: string | null | undefined;
  now?: Date;
}): Promise<void> {
  if (!isPushSupported) return Promise.resolve();
  return enqueue(async () => {
    await ensureChannels();
    await cancelReminderIds();
    const partner = shortName(input.partnerName);
    const dates = reminderDates({
      now: input.now ?? new Date(),
      time: input.time,
      answeredToday: input.answeredToday,
    });
    for (const date of dates) {
      const copy = reminderCopy({ partner, seed: date.getDate() + date.getMonth() });
      await Notifications.scheduleNotificationAsync({
        identifier: reminderId(date),
        content: {
          title: copy.title,
          body: copy.body,
          data: { kind: 'reminder', url: '/question' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: REMINDER_CHANNEL,
        },
      });
    }
  }).catch(() => {});
}

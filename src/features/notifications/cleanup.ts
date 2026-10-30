// Limpieza al cerrar sesión. Solo depende de supabase y push.ts (sin ciclos con auth).
import { supabase } from '@/lib/supabase';

import { cancelReminders, getDeviceToken } from './push';

const TIMEOUT_MS = 3000;

async function withTimeout<T>(p: Promise<T>): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Quita el token de este celular del servidor y cancela los recordatorios. Nunca lanza. */
export async function cleanupPushForSignOut(): Promise<void> {
  try {
    await withTimeout(
      (async () => {
        await cancelReminders();
        const token = await getDeviceToken();
        if (token) await supabase.rpc('unregister_push_token', { p_token: token });
      })(),
    );
  } catch {
    // best effort
  }
}

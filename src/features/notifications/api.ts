import { normalizePrefs, toPrefsRow, type NotificationPrefs } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

/** Mis preferencias (sin fila = valores por omisión). */
export async function fetchNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const { data, error } = await supabase
    .from('notification_prefs')
    .select('answers, comments, moods, nudges, stories, reminder_enabled, reminder_time')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return normalizePrefs(data);
}

/** Crea o actualiza mi fila; solo se escriben las columnas del cambio. */
export async function upsertNotificationPrefs(
  userId: string,
  partial: Partial<NotificationPrefs>,
): Promise<void> {
  const { error } = await supabase
    .from('notification_prefs')
    .upsert(
      { user_id: userId, ...toPrefsRow(partial), updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}

export async function registerPushToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('register_push_token', { p_token: token });
  if (error) throw error;
}

export async function unregisterPushToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('unregister_push_token', { p_token: token });
  if (error) throw error;
}

/** false = el servidor no tiene push configurado o este celular no tiene token. */
export async function sendTestNotification(): Promise<boolean> {
  const { data, error } = await supabase.rpc('send_test_notification');
  if (error) throw error;
  return data === true;
}

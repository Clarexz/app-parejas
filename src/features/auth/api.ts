import { cleanupPushForSignOut } from '@/features/notifications/cleanup';
import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { emptyWidgetSnapshot } from '@/lib/widgets';
import { saveAndRefresh } from '@/widgets/update';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

/** Sin metadata: el nombre se pide en el onboarding. */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  // Antes de cerrar sesión (después ya no hay permiso para quitar el token).
  await cleanupPushForSignOut();
  // Los widgets pasan a invitar a iniciar sesión (best effort, sin bloquear).
  void saveAndRefresh(emptyWidgetSnapshot('signed_out'));
  const { error } = await supabase.auth.signOut();
  queryClient.clear();
  if (error) throw error;
}

/** Cambia la contraseña de la sesión actual. */
export async function changePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

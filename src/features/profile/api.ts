import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { base64ToArrayBuffer } from '@/lib/base64';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileUpdate = {
  display_name?: string;
  nickname?: string | null;
  birthday?: string | null;
};
type ProfilePatch = ProfileUpdate & { avatar_path?: string };

export const AVATARS_BUCKET = 'avatars';
const MAX_SIDE = 512;

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Reduce a 512 px máx. y JPEG calidad 0.7; devuelve el contenido listo para subir. */
export async function compressToJpeg(localUri: string): Promise<ArrayBuffer> {
  const original = await ImageManipulator.ImageManipulator.manipulate(localUri).renderAsync();
  const context = ImageManipulator.ImageManipulator.manipulate(localUri);
  // Solo se reduce (nunca se agranda): el lado más largo queda en 512 px como máximo.
  if (Math.max(original.width, original.height) > MAX_SIDE) {
    context.resize(original.width >= original.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) throw new Error('No se pudo procesar la foto.');
  return base64ToArrayBuffer(result.base64);
}

/** Sube un JPEG a `avatars/<path>` y devuelve la ruta. */
export async function uploadJpeg(path: string, body: ArrayBuffer): Promise<string> {
  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

/** Borra un archivo; si falla no truena (queda huérfano, no pasa nada). */
export async function removeFileQuietly(path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    await supabase.storage.from(AVATARS_BUCKET).remove([path]);
  } catch {
    // ignorado a propósito
  }
}

export async function uploadAvatar(
  userId: string,
  localUri: string,
  previousPath: string | null,
): Promise<Profile> {
  const body = await compressToJpeg(localUri);
  const path = await uploadJpeg(`${userId}/${Date.now()}.jpg`, body);
  let profile: Profile;
  try {
    profile = await updateProfile(userId, { avatar_path: path });
  } catch (e) {
    await removeFileQuietly(path);
    throw e;
  }
  await removeFileQuietly(previousPath);
  return profile;
}

/** Abre la galería (recorte 1:1). Devuelve la URI local o null si se cancela o no hay permiso. */
export async function pickImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

export async function createSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(AVATARS_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

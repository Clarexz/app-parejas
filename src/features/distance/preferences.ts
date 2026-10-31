// Preferencias locales de "Distancia" (AsyncStorage). El modo es por persona y por celular; el
// opt-in siempre es explícito desde la pantalla Distancia.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isShareMode, type SentLocation, type ShareMode } from '@/lib/distance';

const MODE_KEY = 'distance:mode:v1';
const SENT_KEY = 'distance:last-sent:v1';

export async function readShareMode(userId: string | null | undefined): Promise<ShareMode> {
  if (!userId) return 'off';
  try {
    const raw = await AsyncStorage.getItem(MODE_KEY);
    if (!raw) return 'off';
    const parsed = JSON.parse(raw) as { userId?: unknown; mode?: unknown };
    return parsed.userId === userId && isShareMode(parsed.mode) ? parsed.mode : 'off';
  } catch {
    return 'off';
  }
}

export async function writeShareMode(userId: string, mode: ShareMode): Promise<void> {
  if (mode === 'off') {
    await AsyncStorage.multiRemove([MODE_KEY, SENT_KEY]);
    return;
  }
  await AsyncStorage.setItem(MODE_KEY, JSON.stringify({ userId, mode }));
}

export async function readLastSent(): Promise<SentLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(SENT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<SentLocation>;
    return typeof p.lat === 'number' && typeof p.lng === 'number' && typeof p.at === 'number'
      ? { lat: p.lat, lng: p.lng, at: p.at }
      : null;
  } catch {
    return null;
  }
}

export async function writeLastSent(sent: SentLocation): Promise<void> {
  try {
    await AsyncStorage.setItem(SENT_KEY, JSON.stringify(sent));
  } catch {
    // best effort: sin esto solo se manda de más
  }
}

// Lee del servidor lo que necesitan los widgets. Pensado para correr sin la UI (tarea headless).
import { fetchCoupleState } from '@/features/couple/api';
import { fetchLocations } from '@/features/distance/api';
import { fetchEvents } from '@/features/events/api';
import { fetchMoods } from '@/features/mood/api';
import { fetchStreak } from '@/features/questions/api';
import { supabase } from '@/lib/supabase';
import { snapshotDistance } from '@/lib/distance';
import { latestMoodByUser } from '@/lib/mood';
import {
  buildWidgetSnapshot,
  emptyWidgetSnapshot,
  profileFruit,
  snapshotFruits,
  type SnapshotStreak,
  type WidgetSnapshot,
} from '@/lib/widgets';

import { fetchPartnerStory } from './partnerStory';
import { readSnapshot } from './storage';

export const FETCH_TIMEOUT_MS = 8000;

class TimeoutError extends Error {}

/** Racha de preguntas; si falla la lectura se conserva la del snapshot anterior. */
async function readStreak(fallback: SnapshotStreak | null): Promise<SnapshotStreak | null> {
  try {
    const s = await fetchStreak();
    return { current: s.current, answeredToday: s.today_done };
  } catch {
    return fallback;
  }
}

async function read(): Promise<WidgetSnapshot> {
  // getSession() refresca el token con el refresh token persistido si ya venció.
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user.id;
  if (!userId) return emptyWidgetSnapshot('signed_out');

  const state = await fetchCoupleState(userId);
  if (!state.couple) return emptyWidgetSnapshot('no_couple');

  const previous = await readSnapshot();
  const [moods, events, locations, streak] = await Promise.all([
    fetchMoods(state.couple.id, 20),
    fetchEvents(state.couple.id),
    fetchLocations(state.couple.id),
    readStreak(previous?.streak ?? null),
  ]);
  const partnerMood = state.partner ? (latestMoodByUser(moods)[state.partner.id] ?? null) : null;
  // La miniatura de la story se reutiliza del snapshot anterior si no cambió la story.
  const partnerStory = state.partner ? await fetchPartnerStory(state.partner.id, previous) : null;
  const nameOf = (p: typeof state.me) =>
    p ? { name: p.nickname || p.display_name, birthday: p.birthday } : null;

  return buildWidgetSnapshot({
    anniversary: state.couple.anniversary_date,
    timezone: state.couple.timezone,
    me: nameOf(state.me),
    partner: nameOf(state.partner),
    partnerMood,
    partnerId: state.partner?.id ?? null,
    partnerStory,
    events,
    // `profiles.fruit` puede no existir todavía en el servidor: sin ella caen Sandía / Mango.
    fruits: snapshotFruits(profileFruit(state.me), profileFruit(state.partner)),
    streak,
    distance: snapshotDistance(locations, userId, state.partner?.id),
  });
}

/**
 * Arma el snapshot desde el servidor. Devuelve null ante error de red o timeout (así se conserva
 * el snapshot anterior). Nunca lanza.
 */
export async function fetchSnapshot(timeoutMs = FETCH_TIMEOUT_MS): Promise<WidgetSnapshot | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError()), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

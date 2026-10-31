// Ubicación en segundo plano (opcional, "Permitir todo el tiempo"). Misma idea que
// src/widgets/backgroundTask.ts: la tarea se define en el scope del módulo y este módulo se
// importa desde index.ts para que corra con la app cerrada. Solo Android. Nunca lanza.
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

import { LOCATION_TASK, sendLocation } from './locationService';

type TaskBody = {
  data?: { locations?: { coords: { latitude: number; longitude: number } }[] } | null;
  error?: unknown;
};

/** Manda la ubicación más reciente del lote con la sesión persistida de supabase. */
export async function locationTask({ data, error }: TaskBody, now = Date.now()): Promise<void> {
  try {
    if (error) return;
    const last = data?.locations?.[data.locations.length - 1];
    if (!last) return;
    // getSession() refresca el token con el refresh token persistido si ya venció.
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;
    await sendLocation({ lat: last.coords.latitude, lng: last.coords.longitude }, { now });
  } catch {
    // best effort: la siguiente actualización lo vuelve a intentar
  }
}

if (Platform.OS === 'android') {
  try {
    TaskManager.defineTask<TaskBody['data']>(LOCATION_TASK, async ({ data, error }) => {
      await locationTask({ data, error });
    });
  } catch {
    // best effort
  }
}

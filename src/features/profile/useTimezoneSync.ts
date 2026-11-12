import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/features/auth';
import { supabase } from '@/lib/supabase';
import { detectTimeZone } from '@/lib/timezone';

import { useProfile } from './hooks';

/** Queries que dependen de "el día" de la pareja (prefijos de `questionKeys` y el perfil). */
const DAY_DEPENDENT_KEYS = [
  ['profile'],
  ['couple'],
  ['daily-question'],
  ['streak'],
  ['history'],
  ['category-questions'],
] as const;

/**
 * Sin UI: manda la zona horaria de este celular al servidor (`set_my_timezone`) al abrir la app y
 * al volver a primer plano, solo si difiere de `profiles.timezone`. Silencioso si falla. Móntalo
 * en el layout raíz con la sesión lista.
 */
export function useTimezoneSync(): void {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const profileLoaded = !!profile;
  const saved = profile?.timezone ?? null;
  const running = useRef(false);
  const savedRef = useRef(saved);

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  useEffect(() => {
    if (!userId || !profileLoaded) return;
    let cancelled = false;

    const sync = async () => {
      const current = detectTimeZone();
      if (running.current || current === savedRef.current) return;
      running.current = true;
      try {
        const { error } = await supabase.rpc('set_my_timezone', { p_timezone: current });
        if (error) throw error;
        savedRef.current = current;
        if (!cancelled) {
          for (const queryKey of DAY_DEPENDENT_KEYS) void qc.invalidateQueries({ queryKey });
        }
      } catch {
        // silencioso; se reintenta al volver a primer plano
      } finally {
        running.current = false;
      }
    };

    void sync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [userId, profileLoaded, qc]);
}

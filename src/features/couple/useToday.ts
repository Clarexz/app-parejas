import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { todayIn } from '@/lib/dates';
import { DEFAULT_TIME_ZONE } from '@/lib/timezone';

import { useCouple } from './hooks';

/** Cada cuánto se revisa si ya cambió el día con la app abierta. */
const TICK_MS = 60_000;

/**
 * "Hoy" ('YYYY-MM-DD') en la zona horaria de la pareja. Se actualiza solo al pasar la
 * medianoche con la app abierta y al volver a primer plano.
 */
export function useToday(): { today: string; timeZone: string } {
  const { couple } = useCouple();
  const timeZone = couple?.timezone || DEFAULT_TIME_ZONE;
  const [today, setToday] = useState(() => todayIn(timeZone));

  useEffect(() => {
    const check = () => setToday(todayIn(timeZone));
    check();
    const timer = setInterval(check, TICK_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [timeZone]);

  return { today, timeZone };
}

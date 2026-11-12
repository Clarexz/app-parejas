import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { coupleToday, coupleDayZone } from '@/lib/coupleDay';
import { DEFAULT_TIME_ZONE, detectTimeZone } from '@/lib/timezone';

import { useCouple } from './hooks';

/** Cada cuánto se revisa si ya cambió el día con la app abierta. */
const TICK_MS = 60_000;

/**
 * "Hoy" ('YYYY-MM-DD') de la pareja: el día de quien va más atrás (la zona de este celular o la
 * de la pareja; sin zona propia se usa `couple.timezone`). `timeZone` es la zona ganadora. Se
 * actualiza solo al pasar la medianoche con la app abierta y al volver a primer plano.
 */
export function useToday(): { today: string; timeZone: string } {
  const { couple, partner } = useCouple();
  const fallback = couple?.timezone || DEFAULT_TIME_ZONE;
  const partnerZone = partner?.timezone ?? null;
  const myZone = detectTimeZone();
  const [today, setToday] = useState(() => coupleToday([myZone, partnerZone], fallback));
  const [timeZone, setTimeZone] = useState(() => coupleDayZone([myZone, partnerZone], fallback));

  useEffect(() => {
    const check = () => {
      const zones = [detectTimeZone(), partnerZone];
      setToday(coupleToday(zones, fallback));
      setTimeZone(coupleDayZone(zones, fallback));
    };
    check();
    const timer = setInterval(check, TICK_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [fallback, partnerZone]);

  return { today, timeZone };
}

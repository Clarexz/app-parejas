import { useCouple } from '@/features/couple';

import { useEventsRealtime } from '../hooks';

/** Realtime de eventos (sin UI propia): se monta en Inicio y en la pantalla de cuentas regresivas. */
export function EventsEvents() {
  const { couple } = useCouple();
  useEventsRealtime(couple?.id ?? null);
  return null;
}

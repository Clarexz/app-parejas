import { useMemoriesRealtime } from '../hooks';

/** Se monta UNA vez en el layout raíz: Realtime de memorias y fotos (sin UI propia). */
export function MemoriesEvents() {
  useMemoriesRealtime();
  return null;
}

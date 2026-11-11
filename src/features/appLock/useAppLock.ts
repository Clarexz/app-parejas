import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { shouldLock } from '@/lib/appLock';

import { authenticate } from './authenticate';
import { hydrateAppLock, setAppLockUnlocked, useAppLockStore } from './store';

/**
 * Estado del bloqueo. `locked`: hay que autenticar (arranque en frío o plazo vencido). `covered`:
 * la app está en segundo plano (o en transición) y se tapa el contenido para el selector de apps
 * recientes. Nunca se activa en web.
 */
export function useAppLock() {
  const supported = Platform.OS === 'android';
  const { enabled, timeout, hydrated, unlocked } = useAppLockStore();
  const active = supported && enabled;

  const [covered, setCovered] = useState(false);
  const [busy, setBusy] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const authenticating = useRef(false);

  useEffect(() => {
    if (supported) void hydrateAppLock();
  }, [supported]);

  useEffect(() => {
    if (!active) return;
    const sub = AppState.addEventListener('change', (state) => {
      // El aviso de huella puede mover el estado: durante él no se cuenta como "salir".
      if (authenticating.current) return;
      if (state === 'active') {
        const lock = shouldLock({
          enabled: true,
          timeout,
          backgroundedAt: backgroundedAt.current,
          now: Date.now(),
          coldStart: false,
        });
        backgroundedAt.current = null;
        if (lock) setAppLockUnlocked(false);
        setCovered(false);
      } else {
        backgroundedAt.current ??= Date.now();
        setCovered(true);
      }
    });
    return () => sub.remove();
  }, [active, timeout]);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    setBusy(true);
    try {
      if (await authenticate()) {
        backgroundedAt.current = null;
        setAppLockUnlocked(true);
        setCovered(false);
      }
    } finally {
      authenticating.current = false;
      setBusy(false);
    }
  }, []);

  return {
    /** Mientras no se lee la preferencia se tapa todo (sin parpadeo del contenido). */
    pending: supported && !hydrated,
    locked: active && !unlocked,
    covered: active && covered,
    busy,
    unlock,
  };
}

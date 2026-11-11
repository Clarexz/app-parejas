// Preferencia local del bloqueo (por celular, nunca va al servidor). Zustand + AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { isAppLockTimeout, type AppLockTimeout } from '@/lib/appLock';

const KEY = 'app-lock:v1';

export type AppLockPrefs = { enabled: boolean; timeout: AppLockTimeout };

type State = AppLockPrefs & {
  /** Ya se leyó AsyncStorage (hasta entonces no se sabe si hay bloqueo). */
  hydrated: boolean;
  /** Aviso en Ajustes cuando el celular no tiene huella ni bloqueo de pantalla. */
  setupHint: boolean;
  /** Ya se desbloqueó en esta sesión de la app (arranque en frío = `false`). */
  unlocked: boolean;
};

export const DEFAULT_PREFS: AppLockPrefs = { enabled: false, timeout: 'immediate' };

export const useAppLockStore = create<State>(() => ({
  ...DEFAULT_PREFS,
  hydrated: false,
  setupHint: false,
  unlocked: false,
}));

async function persist(prefs: AppLockPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // best effort: sin esto solo se pierde la preferencia al reiniciar
  }
}

/** Lee la preferencia guardada. Se llama una vez al montar el gate. */
export async function hydrateAppLock(): Promise<void> {
  let prefs = DEFAULT_PREFS;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as { enabled?: unknown; timeout?: unknown };
      prefs = {
        enabled: p.enabled === true,
        timeout: isAppLockTimeout(p.timeout) ? p.timeout : DEFAULT_PREFS.timeout,
      };
    }
  } catch {
    // sin preferencia legible = bloqueo apagado
  }
  useAppLockStore.setState({ ...prefs, hydrated: true });
}

export function setAppLockEnabled(enabled: boolean): void {
  const { timeout } = useAppLockStore.getState();
  // Quien lo activa acaba de autenticarse: no se le bloquea en el mismo momento.
  useAppLockStore.setState({ enabled, setupHint: false, unlocked: true });
  void persist({ enabled, timeout });
}

export function setAppLockTimeout(timeout: AppLockTimeout): void {
  const { enabled } = useAppLockStore.getState();
  useAppLockStore.setState({ timeout });
  void persist({ enabled, timeout });
}

export function setAppLockSetupHint(setupHint: boolean): void {
  useAppLockStore.setState({ setupHint });
}

/** Al cerrar sesión: el bloqueo es de la persona, no del celular. */
export async function clearAppLock(): Promise<void> {
  useAppLockStore.setState({ ...DEFAULT_PREFS, setupHint: false });
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best effort
  }
}

export function setAppLockUnlocked(unlocked: boolean): void {
  useAppLockStore.setState({ unlocked });
}

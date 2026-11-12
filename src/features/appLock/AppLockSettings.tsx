import { useState } from 'react';
import { Platform, View } from 'react-native';

import { ListRow, Notice, Segmented, Text, Toggle } from '@/components';
import { APP_LOCK_TIMEOUTS, timeoutLabel, type AppLockTimeout } from '@/lib/appLock';
import { useTheme } from '@/theme';

import { authenticate, canAuthenticate } from './authenticate';
import {
  setAppLockEnabled,
  setAppLockSetupHint,
  setAppLockTimeout,
  useAppLockStore,
} from './store';

/** El bloqueo solo existe en Android (en web es solo QA). */
export const isAppLockSupported = Platform.OS === 'android';

/**
 * Renglón "Bloquear con huella" para `ListGroup` (reenvía `divider`). Al activar confirma con una
 * autenticación; si el celular no tiene huella ni bloqueo de pantalla, deja el aviso.
 */
export function AppLockRow({ divider }: { divider?: boolean }) {
  const enabled = useAppLockStore((s) => s.enabled);
  const [checking, setChecking] = useState(false);

  const onChange = async (next: boolean) => {
    if (!next) {
      setAppLockEnabled(false);
      return;
    }
    setChecking(true);
    try {
      if (!(await canAuthenticate())) {
        setAppLockSetupHint(true);
        return;
      }
      if (await authenticate()) setAppLockEnabled(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <ListRow
      label="Bloquear con huella"
      icon="lock"
      divider={divider}
      right={
        <Toggle
          value={enabled}
          onValueChange={(v) => void onChange(v)}
          accessibilityLabel="Bloquear con huella"
          disabled={checking}
        />
      }
    />
  );
}

/** Debajo del grupo: el aviso de configuración y el tiempo para volver a pedir la huella. */
export function AppLockOptions() {
  const { spacing } = useTheme();
  const { enabled, timeout, setupHint } = useAppLockStore();
  if (!setupHint && !enabled) return null;
  return (
    <View style={{ gap: spacing.md }}>
      {setupHint ? (
        <Notice>
          Primero configura una huella o un bloqueo de pantalla en tu celular y vuelve a intentar.
        </Notice>
      ) : null}
      {enabled ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="note" tone="muted">
            Volver a pedirla
          </Text>
          <Segmented<AppLockTimeout>
            fullWidth
            accessibilityLabel="Cuándo volver a pedir la huella"
            options={APP_LOCK_TIMEOUTS.map((value) => ({ value, label: timeoutLabel(value) }))}
            value={timeout}
            onChange={setAppLockTimeout}
          />
        </View>
      ) : null}
    </View>
  );
}

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { LockScreen } from './LockScreen';
import { useAppLock } from './useAppLock';

/** Envuelve la app: encima del contenido pone la `LockScreen` cuando toca bloquear o tapar. */
export function AppLockGate({ children }: { children: ReactNode }) {
  const { pending, locked, covered, busy, unlock } = useAppLock();
  const showCover = pending || locked || covered;
  return (
    <View style={styles.root}>
      {children}
      {showCover ? <LockScreen locked={locked} busy={busy} onUnlock={() => void unlock()} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Háptica solo en momentos clave (DISENO §5). No-op en web y tolerante a errores.
function run(fn: () => Promise<unknown>) {
  if (Platform.OS === 'web') return;
  try {
    void fn().catch(() => {});
  } catch {
    // Sin motor háptico: no pasa nada.
  }
}

export const haptic = {
  /** Pegar un objeto. */
  stick: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Sellar algo importante. */
  stamp: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Desdoblar / confirmar. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

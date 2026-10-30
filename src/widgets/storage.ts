// Snapshot de los widgets en AsyncStorage. Funciona igual desde la tarea headless (sin la UI).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseWidgetSnapshot, type WidgetSnapshot } from '@/lib/widgets';

export const WIDGET_SNAPSHOT_KEY = 'widget-snapshot-v1';

/** Lee el snapshot guardado; null si no hay, está roto o es de otra versión. Nunca lanza. */
export async function readSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    return parseWidgetSnapshot(await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY));
  } catch {
    return null;
  }
}

/** Guarda el snapshot. Nunca lanza. */
export async function writeSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // best effort
  }
}

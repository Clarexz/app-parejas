// Redibujo de los widgets desde la app o desde una tarea en segundo plano. Solo Android.
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { WIDGET_NAMES, snapshotChanged, widgetModel, type WidgetSnapshot } from '@/lib/widgets';

import { renderWidget } from './render';
import { readSnapshot, writeSnapshot } from './storage';

/** Redibuja todos los widgets de la pantalla de inicio con el snapshot dado (o el guardado). */
export async function refreshWidgets(snapshot?: WidgetSnapshot | null): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const snap = snapshot === undefined ? await readSnapshot() : snapshot;
    await Promise.all(
      WIDGET_NAMES.map((name) =>
        requestWidgetUpdate({
          widgetName: name,
          renderWidget: (info) =>
            renderWidget(name, widgetModel(snap), { width: info.width, height: info.height }),
        }).catch(() => {}),
      ),
    );
  } catch {
    // best effort
  }
}

/** Guarda el snapshot y redibuja solo si algo visible cambió. Nunca lanza. */
export async function saveAndRefresh(snapshot: WidgetSnapshot): Promise<void> {
  try {
    const previous = await readSnapshot();
    const changed = snapshotChanged(previous, snapshot);
    await writeSnapshot(snapshot);
    if (changed) await refreshWidgets(snapshot);
  } catch {
    // best effort
  }
}

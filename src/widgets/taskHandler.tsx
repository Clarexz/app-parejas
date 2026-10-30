// Manejador de las acciones de los widgets (se registra en index.ts). Corre aunque la app esté
// cerrada, así que solo usa AsyncStorage y fetch (nada de la UI).
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { WIDGET_NAMES, widgetModel, type WidgetName } from '@/lib/widgets';

import { fetchSnapshot } from './fetchSnapshot';
import { renderWidget } from './render';
import { readSnapshot, writeSnapshot } from './storage';
import { refreshWidgets } from './update';

function isWidgetName(name: string): name is WidgetName {
  return (WIDGET_NAMES as readonly string[]).includes(name);
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetName, width, height } = props.widgetInfo;
  if (!isWidgetName(widgetName)) return;

  try {
    switch (props.widgetAction) {
      case 'WIDGET_ADDED':
      case 'WIDGET_RESIZED':
      case 'WIDGET_UPDATE': {
        let snapshot = await readSnapshot();
        const stale = !snapshot || widgetModel(snapshot).stale;
        if (props.widgetAction === 'WIDGET_UPDATE' && stale) {
          const fresh = await fetchSnapshot();
          if (fresh) {
            await writeSnapshot(fresh);
            snapshot = fresh;
            // Los demás widgets también se benefician de los datos nuevos.
            await refreshWidgets(fresh);
          }
        }
        props.renderWidget(renderWidget(widgetName, widgetModel(snapshot), { width, height }));
        break;
      }
      default:
        // WIDGET_DELETED y WIDGET_CLICK: nada que hacer (los toques abren la app por URI).
        break;
    }
  } catch {
    // Un widget sin redibujar es mejor que una tarea que falla.
  }
}

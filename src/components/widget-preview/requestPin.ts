// "Agregar a mi pantalla": pide al launcher fijar el widget. Módulo aparte para aislar la
// librería nativa de la web; en web (QA visual) no hace nada.
import { Platform } from 'react-native';

import type { WidgetName } from '@/lib/widgets';

/** `true` si el launcher aceptó la solicitud; `false` si no la soporta o no es Android. */
export async function pinWidget(name: WidgetName): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const { requestPinWidget } = await import('react-native-android-widget');
    return await requestPinWidget({ widgetName: name });
  } catch {
    return false;
  }
}

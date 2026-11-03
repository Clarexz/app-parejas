// Dibujo de los widgets (react-native-android-widget). Contrato estable entre el task handler y
// los componentes: dado el nombre, el modelo (src/lib/widgets.ts) y el tamaño en dp, devuelve las
// variantes clara y oscura (Android elige según el tema del sistema). Los seis widgets son 1×1,
// sin fondo, con una forma de vidrio y un dato debajo (docs/DISENO.md §9).
import type { WidgetRepresentation } from 'react-native-android-widget';

import type { WidgetModel, WidgetName } from '@/lib/widgets';

import { WidgetFrame, palettes, type WidgetSize } from './components';
import { widgetView } from './view';

export type { WidgetSize };

export function renderWidget(
  name: WidgetName,
  model: WidgetModel,
  size: WidgetSize,
): WidgetRepresentation {
  const view = widgetView(name, model);
  const draw = (palette: typeof palettes.light) => (
    <WidgetFrame name={name} palette={palette} size={size} view={view} />
  );
  return { light: draw(palettes.light), dark: draw(palettes.dark) };
}

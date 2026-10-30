// Dibujo de los widgets (react-native-android-widget). Contrato estable entre el task handler y
// los componentes: dado el nombre, el modelo (src/lib/widgets.ts) y el tamaño en dp, devuelve las
// variantes clara y oscura. STUB: lo reemplaza el diseño de la Fase 5.
import { FlexWidget, TextWidget, type WidgetRepresentation } from 'react-native-android-widget';

import type { WidgetModel, WidgetName } from '@/lib/widgets';

export type WidgetSize = { width: number; height: number };

export function renderWidget(
  name: WidgetName,
  model: WidgetModel,
  _size: WidgetSize,
): WidgetRepresentation {
  const text = name === 'DaysTogether' ? String(model.daysTogether ?? '') : model.partnerName;
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent' }}>
      <TextWidget text={text} />
    </FlexWidget>
  );
}

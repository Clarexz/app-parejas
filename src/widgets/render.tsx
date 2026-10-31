// Dibujo de los widgets (react-native-android-widget). Contrato estable entre el task handler y
// los componentes: dado el nombre, el modelo (src/lib/widgets.ts) y el tamaño en dp, devuelve las
// variantes clara y oscura (Android elige según el tema del sistema). Diseño: docs/DISENO.md §7.
import type { WidgetRepresentation } from 'react-native-android-widget';

import type { WidgetModel, WidgetName } from '@/lib/widgets';

import {
  CountdownWidget,
  DaysTogetherWidget,
  PartnerMoodWidget,
  PartnerStoryWidget,
  palettes,
  type WidgetSize,
} from './components';

export type { WidgetSize };

export function renderWidget(
  name: WidgetName,
  model: WidgetModel,
  size: WidgetSize,
): WidgetRepresentation {
  const draw = (palette: typeof palettes.light) => {
    switch (name) {
      case 'DaysTogether':
        return <DaysTogetherWidget name={name} palette={palette} size={size} model={model} />;
      case 'PartnerMood':
        return <PartnerMoodWidget name={name} palette={palette} size={size} model={model} />;
      case 'Countdown':
        return <CountdownWidget name={name} palette={palette} size={size} model={model} />;
      case 'PartnerStory':
        return <PartnerStoryWidget name={name} palette={palette} size={size} model={model} />;
    }
  };
  return { light: draw(palettes.light), dark: draw(palettes.dark) };
}

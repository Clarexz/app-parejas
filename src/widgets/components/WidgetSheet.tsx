'use no memo';
// Hoja de cuaderno que envuelve a los tres widgets: fondo SVG (cuadrícula + cinta) y contenido
// encima. Todo el widget es tocable y lleva a la ruta de WIDGET_ROUTES.
import type { ReactNode } from 'react';
import { FlexWidget, OverlapWidget, SvgWidget } from 'react-native-android-widget';

import type { WidgetName } from '@/lib/widgets';

import { isMedium, tapProps, type WidgetPalette, type WidgetSize } from './palette';
import { sheetSvg, type TapeTone } from './svg';

type Props = {
  name: WidgetName;
  palette: WidgetPalette;
  size: WidgetSize;
  tape: TapeTone;
  /** Descripción para lectores de pantalla de todo el widget. */
  label: string;
  children: ReactNode;
};

export function WidgetSheet({ name, palette, size, tape, label, children }: Props) {
  const medium = isMedium(size);
  const svg = sheetSvg(palette, size, { tape, margin: medium });
  return (
    <OverlapWidget
      style={{ width: 'match_parent', height: 'match_parent' }}
      {...tapProps(name, label)}
    >
      <SvgWidget svg={svg} style={{ width: 'match_parent', height: 'match_parent' }} />
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingTop: 16,
          paddingBottom: 12,
          // En mediano el contenido arranca a la derecha del margen rojo.
          paddingLeft: medium ? 34 : 14,
          paddingRight: 14,
          overflow: 'hidden',
        }}
      >
        {children}
      </FlexWidget>
    </OverlapWidget>
  );
}

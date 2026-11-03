'use no memo';
// Marco común de los seis widgets 1×1: sin fondo, la forma con vidrio (SVG) y debajo el dato en
// blanco con sombra oscura para que se lea sobre fondos claros, oscuros y fotos.
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { widgetShapeSvg, type WidgetView } from '../view';
import { col, FONT, tapProps, type WidgetProps } from './palette';

type Props = WidgetProps & { view: WidgetView };

/** Alto reservado al dato (dp) y aire alrededor de la forma. */
const LABEL_HEIGHT = 18;
const GAP = 2;
const MIN_SIDE = 32;

/** Lado (dp) de la forma: lo que quepa dejando lugar al dato. */
export function shapeSide(width: number, height: number): number {
  const side = Math.min(width - 4, height - LABEL_HEIGHT - GAP - 2);
  return Math.max(MIN_SIDE, Math.floor(side));
}

/** Tamaño de letra del dato: baja con el largo para que quepa en una sola línea. */
export function labelFontSize(text: string): number {
  if (text.length <= 9) return 13;
  if (text.length <= 12) return 11.5;
  return 10;
}

export function WidgetFrame({ name, size, palette, view }: Props) {
  const side = shapeSide(size.width, size.height);
  const svg = widgetShapeSvg(view, { dark: palette.isDark, size: side });
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      {...tapProps(name, view.a11y, view.route)}
    >
      <SvgWidget svg={svg} style={{ width: side, height: side }} />
      <TextWidget
        text={view.text}
        maxLines={1}
        truncate="END"
        allowFontScaling={false}
        style={{
          width: 'match_parent',
          height: LABEL_HEIGHT,
          marginTop: GAP,
          fontFamily: FONT.semiBold,
          fontSize: labelFontSize(view.text),
          textAlign: 'center',
          color: col('#FFFFFF'),
          textShadowColor: col('rgba(0,0,0,0.65)'),
          textShadowRadius: 3,
          textShadowOffset: { width: 0, height: 1 },
        }}
      />
    </FlexWidget>
  );
}

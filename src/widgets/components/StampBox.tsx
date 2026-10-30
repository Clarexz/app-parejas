'use no memo';
// Sello de fechador: Courier Prime en mayúsculas con marco, inclinado −2° (DISENO §7 `Stamp`).
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { col, FONT, type WidgetPalette } from './palette';

type Props = {
  text: string;
  palette: WidgetPalette;
  tone?: 'jamaica' | 'ink' | 'nopal';
  fontSize?: number;
};

export function StampBox({ text, palette, tone = 'jamaica', fontSize = 10 }: Props) {
  const color = col({ jamaica: palette.jamaica, ink: palette.ink, nopal: palette.nopal }[tone]);
  return (
    <FlexWidget
      style={{
        borderWidth: 1.5,
        borderColor: color,
        borderRadius: 2,
        paddingHorizontal: 5,
        paddingVertical: 3,
        rotation: -2,
      }}
    >
      <TextWidget
        text={text.toUpperCase()}
        maxLines={1}
        truncate="END"
        style={{ fontFamily: FONT.monoBold, fontSize, letterSpacing: 0.8, color }}
      />
    </FlexWidget>
  );
}

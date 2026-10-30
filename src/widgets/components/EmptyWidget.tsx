'use no memo';
// Estado sin sesión o sin pareja: invita a abrir la app.
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { APP_NAME } from '@/constants/app';
import type { WidgetStatus } from '@/lib/widgets';

import { StampBox } from './StampBox';
import { col, FONT, isMedium, type WidgetProps } from './palette';
import { WidgetSheet } from './WidgetSheet';
import type { TapeTone } from './svg';

type Props = WidgetProps & { status: Exclude<WidgetStatus, 'ready'>; tape: TapeTone };

export function EmptyWidget({ name, palette, size, status, tape }: Props) {
  const medium = isMedium(size);
  const title = status === 'signed_out' ? 'Abre la app para empezar' : 'Falta tu pareja';
  const hint =
    status === 'signed_out'
      ? 'Inicia sesión y tu libreta aparece aquí.'
      : 'Abre la app y vincúlense con su código.';
  return (
    <WidgetSheet
      name={name}
      palette={palette}
      size={size}
      tape={tape}
      label={`${title}. ${hint} Toca para abrir ${APP_NAME}.`}
    >
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
        <TextWidget
          text={title}
          maxLines={2}
          truncate="END"
          allowFontScaling={false}
          style={{
            fontFamily: FONT.hand,
            fontSize: medium ? 26 : 20,
            lineHeight: medium ? 28 : 22,
            color: col(palette.ink),
          }}
        />
        <FlexWidget style={{ height: 4, width: 'match_parent' }} />
        <TextWidget
          text={hint}
          maxLines={medium ? 2 : 3}
          truncate="END"
          style={{
            fontFamily: FONT.bodyMedium,
            fontSize: 12.5,
            lineHeight: 16,
            color: col(palette.inkMuted),
          }}
        />
        {medium ? (
          <FlexWidget style={{ marginTop: 8 }}>
            <StampBox text={APP_NAME} palette={palette} />
          </FlexWidget>
        ) : null}
      </FlexWidget>
    </WidgetSheet>
  );
}

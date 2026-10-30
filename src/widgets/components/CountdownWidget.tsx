'use no memo';
// Widget "Cuenta regresiva": lo próximo que viene, con la fecha en sello de fechador.
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { formatDaysUntil } from '@/lib/dates';
import { formatStampIsoDate } from '@/lib/stampDate';
import type { WidgetModel } from '@/lib/widgets';

import { EmptyWidget } from './EmptyWidget';
import { StampBox } from './StampBox';
import { col, FONT, isMedium, type WidgetProps } from './palette';
import { WidgetSheet } from './WidgetSheet';

type Props = WidgetProps & { model: WidgetModel };

const TAPE = 'pink' as const;

export function CountdownWidget({ name, palette, size, model }: Props) {
  if (model.status !== 'ready') {
    return (
      <EmptyWidget name={name} palette={palette} size={size} status={model.status} tape={TAPE} />
    );
  }
  const medium = isMedium(size);
  const event = model.nextEvent;

  if (!event) {
    return (
      <WidgetSheet
        name={name}
        palette={palette}
        size={size}
        tape={TAPE}
        label="No hay nada próximo en el calendario. Toca para abrir la app."
      >
        <TextWidget
          text="Nada a la vista"
          maxLines={1}
          truncate="END"
          allowFontScaling={false}
          style={{ fontFamily: FONT.hand, fontSize: medium ? 28 : 21, color: col(palette.ink) }}
        />
        <TextWidget
          text="Pongan su aniversario y sus cumples en la app."
          maxLines={2}
          truncate="END"
          style={{
            fontFamily: FONT.bodyMedium,
            fontSize: 12.5,
            lineHeight: 16,
            color: col(palette.inkMuted),
          }}
        />
      </WidgetSheet>
    );
  }

  const phrase = event.daysUntil === 0 ? '¡hoy!' : formatDaysUntil(event.daysUntil);
  const soon = event.daysUntil <= 1;
  const stampDate = formatStampIsoDate(event.date);
  // En chico se omite el día de la semana para que el sello quepa.
  const stampText = medium ? stampDate : stampDate.split(' ').slice(1).join(' ');
  const phraseSize = medium ? (phrase.length > 9 ? 30 : 38) : phrase.length > 8 ? 24 : 30;
  const label = `${event.title}: ${
    event.daysUntil === 0 ? 'es hoy' : formatDaysUntil(event.daysUntil)
  }, ${stampDate}.`;

  const texts = (
    <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
      <TextWidget
        text={phrase}
        maxLines={1}
        truncate="END"
        allowFontScaling={false}
        style={{
          fontFamily: FONT.hand,
          fontSize: phraseSize,
          lineHeight: Math.round(phraseSize * 1.05),
          color: col(soon ? palette.jamaica : palette.ink),
        }}
      />
      <TextWidget
        text={event.title}
        maxLines={2}
        truncate="END"
        style={{
          fontFamily: FONT.bodySemiBold,
          fontSize: medium ? 14 : 12.5,
          lineHeight: medium ? 18 : 16,
          color: col(palette.inkMuted),
          marginTop: 2,
        }}
      />
    </FlexWidget>
  );

  return (
    <WidgetSheet name={name} palette={palette} size={size} tape={TAPE} label={label}>
      {medium ? (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
          {texts}
          <FlexWidget style={{ paddingLeft: 8 }}>
            <StampBox text={stampText} palette={palette} fontSize={9.5} />
          </FlexWidget>
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
          <StampBox text={stampText} palette={palette} fontSize={9} />
          <FlexWidget style={{ height: 6, width: 'match_parent' }} />
          {texts}
        </FlexWidget>
      )}
    </WidgetSheet>
  );
}

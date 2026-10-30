'use no memo';
// Widget "Días juntos": el número protagonista escrito a mano y subrayado (DISENO §1.6).
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { formatNumber } from '@/lib/dates';
import { formatStampIsoDate } from '@/lib/stampDate';
import type { WidgetModel } from '@/lib/widgets';

import { EmptyWidget } from './EmptyWidget';
import { StampBox } from './StampBox';
import { underlineSvg } from './svg';
import { col, FONT, isMedium, type WidgetProps } from './palette';
import { WidgetSheet } from './WidgetSheet';

type Props = WidgetProps & { model: WidgetModel };

const TAPE = 'yellow' as const;

export function DaysTogetherWidget({ name, palette, size, model }: Props) {
  if (model.status !== 'ready') {
    return (
      <EmptyWidget name={name} palette={palette} size={size} status={model.status} tape={TAPE} />
    );
  }
  const medium = isMedium(size);
  const count = model.daysTogether ?? model.daysUntilStart;

  // Sin aniversario: invita a ponerlo.
  if (count === null) {
    return (
      <WidgetSheet
        name={name}
        palette={palette}
        size={size}
        tape={TAPE}
        label="Todavía no tienen fecha de aniversario. Toca para abrir la app y ponerla."
      >
        <TextWidget
          text="¿Desde cuándo?"
          maxLines={1}
          truncate="END"
          allowFontScaling={false}
          style={{ fontFamily: FONT.hand, fontSize: medium ? 30 : 22, color: col(palette.ink) }}
        />
        <TextWidget
          text="Pongan su aniversario en la app."
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

  const upcoming = model.daysTogether === null;
  const text = formatNumber(count);
  // El número se achica con las cifras para que nunca se desborde.
  const fontSize =
    text.length <= 3 ? (medium ? 64 : 54) : text.length <= 5 ? (medium ? 50 : 38) : 30;
  const caption = upcoming
    ? count === 1
      ? 'día para empezar'
      : 'días para empezar'
    : 'días juntos';
  const label = upcoming
    ? `Faltan ${text} ${count === 1 ? 'día' : 'días'} para su aniversario con ${model.partnerName}.`
    : `${text} ${count === 1 ? 'día' : 'días'} juntos con ${model.partnerName}.`;

  const number = (
    <FlexWidget style={{ flexDirection: 'column' }}>
      {upcoming ? (
        <TextWidget
          text="Faltan"
          maxLines={1}
          style={{ fontFamily: FONT.bodySemiBold, fontSize: 12.5, color: col(palette.inkMuted) }}
        />
      ) : null}
      <TextWidget
        text={text}
        maxLines={1}
        allowFontScaling={false}
        style={{
          fontFamily: FONT.hand,
          fontSize,
          lineHeight: Math.round(fontSize * 1.05),
          color: col(palette.ink),
        }}
      />
      <SvgWidget
        svg={underlineSvg(palette.jamaica, Math.min(fontSize * text.length * 0.5 + 10, 110))}
        style={{ width: Math.min(fontSize * text.length * 0.5 + 10, 110), height: 8 }}
      />
      <TextWidget
        text={caption}
        maxLines={1}
        truncate="END"
        style={{
          fontFamily: FONT.bodySemiBold,
          fontSize: 13,
          color: col(palette.inkMuted),
          marginTop: 2,
        }}
      />
    </FlexWidget>
  );

  return (
    <WidgetSheet name={name} palette={palette} size={size} tape={TAPE} label={label}>
      {medium ? (
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            width: 'match_parent',
          }}
        >
          {number}
          <FlexWidget style={{ flex: 1, alignItems: 'flex-end', paddingLeft: 8 }}>
            <StampBox text={formatStampIsoDate(model.today)} palette={palette} fontSize={9.5} />
            <TextWidget
              text={`con ${model.partnerName}`}
              maxLines={1}
              truncate="END"
              allowFontScaling={false}
              style={{
                fontFamily: FONT.hand,
                fontSize: 18,
                color: col(palette.ink),
                marginTop: 8,
                textAlign: 'right',
              }}
            />
          </FlexWidget>
        </FlexWidget>
      ) : (
        number
      )}
    </WidgetSheet>
  );
}

'use no memo';
// Widget "Mood de mi pareja": el emoji (contenido del usuario) como sticker y la nota en post-it.
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetModel } from '@/lib/widgets';

import { EmptyWidget } from './EmptyWidget';
import { col, FONT, isMedium, type WidgetProps } from './palette';
import { WidgetSheet } from './WidgetSheet';

type Props = WidgetProps & { model: WidgetModel };

const TAPE = 'mint' as const;

export function PartnerMoodWidget({ name, palette, size, model }: Props) {
  if (model.status !== 'ready') {
    return (
      <EmptyWidget name={name} palette={palette} size={size} status={model.status} tape={TAPE} />
    );
  }
  const medium = isMedium(size);
  const mood = model.partnerMood;
  const partner = model.partnerName;

  if (!mood) {
    return (
      <WidgetSheet
        name={name}
        palette={palette}
        size={size}
        tape={TAPE}
        label={`${partner} aún no comparte su mood. Toca para abrir los moods.`}
      >
        <TextWidget
          text={partner}
          maxLines={1}
          truncate="END"
          allowFontScaling={false}
          style={{ fontFamily: FONT.hand, fontSize: medium ? 28 : 22, color: col(palette.ink) }}
        />
        <TextWidget
          text={`${partner} aún no comparte su mood`}
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

  const status = [mood.label, mood.ago].filter(Boolean).join(' · ');
  const label = `${partner} se siente ${mood.label ?? 'así'} ${mood.emoji}${
    mood.note ? `: ${mood.note}` : ''
  }${mood.ago ? `, ${mood.ago}` : ''}.`;

  // Sticker troquelado: círculo con borde blanco.
  const sticker = (px: number, emoji: number) => (
    <FlexWidget
      style={{
        width: px,
        height: px,
        borderRadius: px / 2,
        backgroundColor: col(palette.polaroid),
        borderWidth: 1,
        borderColor: col(palette.ruled),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget text={mood.emoji} allowFontScaling={false} style={{ fontSize: emoji }} />
    </FlexWidget>
  );

  if (!medium) {
    return (
      <WidgetSheet name={name} palette={palette} size={size} tape={TAPE} label={label}>
        {sticker(52, 30)}
        <TextWidget
          text={partner}
          maxLines={1}
          truncate="END"
          allowFontScaling={false}
          style={{ fontFamily: FONT.hand, fontSize: 19, color: col(palette.ink), marginTop: 6 }}
        />
        <TextWidget
          text={mood.label ?? mood.ago}
          maxLines={1}
          truncate="END"
          style={{ fontFamily: FONT.bodySemiBold, fontSize: 12.5, color: col(palette.inkMuted) }}
        />
      </WidgetSheet>
    );
  }

  const tight = size.height < 110;
  return (
    <WidgetSheet name={name} palette={palette} size={size} tape={TAPE} label={label}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        {sticker(60, 34)}
        <FlexWidget style={{ flex: 1, flexDirection: 'column', paddingLeft: 10 }}>
          <TextWidget
            text={partner}
            maxLines={1}
            truncate="END"
            allowFontScaling={false}
            style={{ fontFamily: FONT.hand, fontSize: 20, lineHeight: 22, color: col(palette.ink) }}
          />
          <TextWidget
            text={status}
            maxLines={1}
            truncate="END"
            style={{
              fontFamily: FONT.bodySemiBold,
              fontSize: 12,
              color: col(palette.inkMuted),
              marginBottom: mood.note ? 4 : 0,
            }}
          />
          {mood.note ? (
            <FlexWidget
              style={{
                backgroundColor: col(palette.postit),
                borderRadius: 2,
                paddingHorizontal: 6,
                paddingVertical: 3,
                width: 'match_parent',
              }}
            >
              <TextWidget
                text={mood.note}
                maxLines={tight ? 1 : 2}
                truncate="END"
                allowFontScaling={false}
                style={{
                  fontFamily: FONT.hand,
                  fontSize: 15,
                  lineHeight: 17,
                  color: col(palette.onPostit),
                }}
              />
            </FlexWidget>
          ) : null}
        </FlexWidget>
      </FlexWidget>
    </WidgetSheet>
  );
}

'use no memo';
// Widget "Distancia": los kilómetros entre los dos, escritos a mano, y las ciudades debajo.
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { formatKm, spokenKm } from '@/lib/distance';
import type { WidgetModel } from '@/lib/widgets';

import { EmptyWidget } from './EmptyWidget';
import { col, FONT, isMedium, type WidgetProps } from './palette';
import { WidgetSheet } from './WidgetSheet';

type Props = WidgetProps & { model: WidgetModel };

const TAPE = 'yellow' as const;

export function DistanceWidget({ name, palette, size, model }: Props) {
  if (model.status !== 'ready') {
    return (
      <EmptyWidget name={name} palette={palette} size={size} status={model.status} tape={TAPE} />
    );
  }
  const medium = isMedium(size);
  const d = model.distance;
  const partner = model.partnerName;

  // Sin los dos: título corto a mano y una línea que explica qué falta.
  if (!d || d.km === null) {
    const title = d?.meSharing ? `Falta ${partner}` : 'Distancia';
    const hint = !d
      ? 'Activen su distancia en la app para ver cuántos kilómetros hay entre ustedes.'
      : d.meSharing
        ? `Cuando ${partner} active su distancia, aquí la ven.`
        : d.partnerSharing
          ? `${partner} ya la comparte. Activa la tuya en la app.`
          : 'Activen su distancia en la app para ver cuántos kilómetros hay entre ustedes.';
    return (
      <WidgetSheet
        name={name}
        palette={palette}
        size={size}
        tape={TAPE}
        label={`Distancia. ${hint} Toca para abrir la app.`}
      >
        <TextWidget
          text={title}
          maxLines={1}
          truncate="END"
          allowFontScaling={false}
          style={{ fontFamily: FONT.hand, fontSize: medium ? 28 : 21, color: col(palette.ink) }}
        />
        <TextWidget
          text={hint}
          maxLines={medium ? 2 : 4}
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

  const kmText = formatKm(d.km);
  const cities = d.myCity && d.partnerCity ? `${d.myCity} ↔ ${d.partnerCity}` : `Tú ↔ ${partner}`;
  const kmSize = medium ? (kmText.length > 8 ? 34 : 42) : kmText.length > 8 ? 24 : 30;
  const label = `Están a ${spokenKm(d.km)}. ${cities}.${
    d.partnerAgo ? ` Ubicación de ${partner}: ${d.partnerAgo}.` : ''
  }`;

  return (
    <WidgetSheet name={name} palette={palette} size={size} tape={TAPE} label={label}>
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
        <TextWidget
          text={kmText}
          maxLines={1}
          truncate="END"
          allowFontScaling={false}
          style={{
            fontFamily: FONT.hand,
            fontSize: kmSize,
            lineHeight: Math.round(kmSize * 1.05),
            color: col(palette.ink),
          }}
        />
        <TextWidget
          text={cities}
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
        {medium && d.partnerAgo ? (
          <TextWidget
            text={`${partner}: ${d.partnerAgo}`}
            maxLines={1}
            truncate="END"
            style={{
              fontFamily: FONT.bodyMedium,
              fontSize: 11.5,
              color: col(palette.inkMuted),
              marginTop: 4,
            }}
          />
        ) : null}
      </FlexWidget>
    </WidgetSheet>
  );
}

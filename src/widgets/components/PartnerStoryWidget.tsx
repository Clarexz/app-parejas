'use no memo';
// Widget "Story de tu pareja": la story activa más nueva, pegada como foto polaroid, ficha de texto
// o dibujo. Sin story invita a pegar una. Toca → la story (o la pestaña Stories).
import { FlexWidget, ImageWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { CANVAS_H, CANVAS_W, strokesToSvg, type StrokeColor } from '@/lib/drawing';
import type { StoryBg, StoryFont } from '@/lib/stories';
import type { WidgetModel, WidgetStory } from '@/lib/widgets';

import { EmptyWidget } from './EmptyWidget';
import { col, FONT, isMedium, type WidgetPalette, type WidgetProps } from './palette';
import { WidgetSheet } from './WidgetSheet';

type Props = WidgetProps & { model: WidgetModel };

const TAPE = 'pink' as const;
// Márgenes de WidgetSheet (ver WidgetSheet.tsx).
const PAD_V = 28;
const PAD_RIGHT = 14;

/** Fondo y color de texto de cada fondo de story (igual que `StoryFrame` en la app). */
export function storyColors(palette: WidgetPalette, bg: StoryBg | null) {
  switch (bg) {
    case 'postit':
      return { bg: palette.postit, fg: palette.onPostit };
    case 'jamaica':
      return { bg: palette.jamaica, fg: palette.onJamaica };
    case 'cempasuchil':
      return { bg: palette.cempasuchil, fg: palette.onPolaroid };
    case 'nopal':
      return { bg: palette.nopal, fg: palette.onJamaica };
    case 'ink':
      return { bg: palette.ink, fg: palette.onJamaica };
    case 'paper':
    default:
      return { bg: palette.paper, fg: palette.ink };
  }
}

/** Colores de los trazos en el widget (sin transparencias: el SVG nativo no las garantiza). */
export function strokePalette(palette: WidgetPalette): Record<StrokeColor, string> {
  return {
    ink: palette.ink,
    jamaica: palette.jamaica,
    cempasuchil: palette.cempasuchil,
    nopal: palette.nopal,
    chile: palette.chile,
    postit: palette.postit,
    paper: palette.paper,
    tapeMint: '#6EBEA5',
  };
}

const FONT_FOR: Record<StoryFont, string> = {
  hand: FONT.hand,
  body: FONT.bodyMedium,
  stamp: FONT.monoBold,
};

const KIND_LABEL = { photo: 'una foto', text: 'una nota', drawing: 'un dibujo' } as const;

function Visual({
  story,
  palette,
  width,
  height,
  medium,
}: {
  story: WidgetStory;
  palette: WidgetPalette;
  width: number;
  height: number;
  medium: boolean;
}) {
  const w = Math.max(24, Math.floor(width));
  const h = Math.max(24, Math.floor(height));

  if (story.kind === 'photo') {
    // Marco polaroid: borde parejo y más grueso abajo.
    const iw = w - 8;
    const ih = h - 4 - 10;
    return (
      <FlexWidget
        style={{
          width: w,
          height: h,
          backgroundColor: col(palette.polaroid),
          borderWidth: 1,
          borderColor: col(palette.ruled),
          borderRadius: 2,
          paddingTop: 4,
          paddingHorizontal: 4,
          paddingBottom: 10,
        }}
      >
        {story.thumb ? (
          <ImageWidget
            image={story.thumb as `data:image${string}`}
            imageWidth={iw}
            imageHeight={ih}
            resizeMode="cover"
            style={{ width: iw, height: ih }}
          />
        ) : (
          <FlexWidget
            style={{
              width: iw,
              height: ih,
              backgroundColor: col(palette.photoEmpty),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget text="📷" allowFontScaling={false} style={{ fontSize: 24 }} />
          </FlexWidget>
        )}
      </FlexWidget>
    );
  }

  if (story.kind === 'drawing') {
    const { bg } = storyColors(palette, story.bg);
    const svg = strokesToSvg(story.strokes ?? [], bg, strokePalette(palette), {
      width: w,
      height: h,
    });
    return (
      <FlexWidget
        style={{
          width: w,
          height: h,
          borderWidth: 1,
          borderColor: col(palette.ruled),
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <SvgWidget svg={svg} style={{ width: w - 2, height: h - 2 }} />
      </FlexWidget>
    );
  }

  // text: ficha sobre su fondo.
  const { bg, fg } = storyColors(palette, story.bg);
  const font = FONT_FOR[story.font ?? 'hand'];
  const size = medium ? 17 : 15;
  const lines = Math.max(2, Math.floor((h - 12) / (size + 3)));
  return (
    <FlexWidget
      style={{
        width: w,
        height: h,
        backgroundColor: col(bg),
        borderRadius: 3,
        borderWidth: 1,
        borderColor: col(palette.ruled),
        paddingHorizontal: 7,
        paddingVertical: 6,
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <TextWidget
        text={story.text ?? ''}
        maxLines={lines}
        truncate="END"
        allowFontScaling={false}
        style={{ fontFamily: font, fontSize: size, lineHeight: size + 3, color: col(fg) }}
      />
    </FlexWidget>
  );
}

export function PartnerStoryWidget({ name, palette, size, model }: Props) {
  if (model.status !== 'ready') {
    return (
      <EmptyWidget name={name} palette={palette} size={size} status={model.status} tape={TAPE} />
    );
  }
  const medium = isMedium(size);
  const partner = model.partnerName;
  const story = model.partnerStory;

  if (!story) {
    return (
      <WidgetSheet
        name={name}
        palette={palette}
        size={size}
        tape={TAPE}
        route="/stories"
        label={`${partner} no ha pegado nada hoy. Toca para pegar una story tú.`}
      >
        <TextWidget
          text={`${partner} no ha pegado nada hoy`}
          maxLines={medium ? 2 : 3}
          truncate="END"
          allowFontScaling={false}
          style={{
            fontFamily: FONT.hand,
            fontSize: medium ? 24 : 18,
            lineHeight: medium ? 26 : 20,
            color: col(palette.ink),
          }}
        />
        <TextWidget
          text="Pégale una tú"
          maxLines={1}
          truncate="END"
          style={{
            fontFamily: FONT.bodySemiBold,
            fontSize: 12.5,
            color: col(palette.jamaica),
            marginTop: 4,
          }}
        />
      </WidgetSheet>
    );
  }

  const route = model.partnerId ? `/story/view?user=${model.partnerId}` : '/stories';
  const label = `Story de ${partner}: ${KIND_LABEL[story.kind]}${
    story.text ? `, ${story.text}` : ''
  }, ${story.ago}. Toca para verla.`;
  const availW = size.width - (medium ? 34 : 14) - PAD_RIGHT;
  const availH = size.height - PAD_V;

  if (!medium) {
    const footerH = 18;
    const visualH = availH - footerH - 3;
    // Dibujo vertical (9:16); foto y ficha ocupan todo el ancho disponible.
    const visualW =
      story.kind === 'drawing' ? Math.min(availW, (visualH * CANVAS_W) / CANVAS_H) : availW;
    return (
      <WidgetSheet
        name={name}
        palette={palette}
        size={size}
        tape={TAPE}
        label={label}
        route={route}
      >
        <FlexWidget
          style={{ width: 'match_parent', flexDirection: 'column', alignItems: 'center' }}
        >
          <Visual story={story} palette={palette} width={visualW} height={visualH} medium={false} />
          <TextWidget
            text={`${partner} · ${story.ago}`}
            maxLines={1}
            truncate="END"
            allowFontScaling={false}
            style={{ fontFamily: FONT.hand, fontSize: 15, color: col(palette.ink), marginTop: 3 }}
          />
        </FlexWidget>
      </WidgetSheet>
    );
  }

  const textW = Math.max(90, availW - 100 - 10);
  const visualW =
    story.kind === 'drawing'
      ? (availH * CANVAS_W) / CANVAS_H
      : story.kind === 'photo'
        ? Math.min(availH, availW - 90)
        : textW;
  const caption = story.kind === 'photo' ? story.text : null;
  return (
    <WidgetSheet name={name} palette={palette} size={size} tape={TAPE} label={label} route={route}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <Visual story={story} palette={palette} width={visualW} height={availH} medium />
        <FlexWidget style={{ flex: 1, flexDirection: 'column', paddingLeft: 10 }}>
          <TextWidget
            text={partner}
            maxLines={1}
            truncate="END"
            allowFontScaling={false}
            style={{ fontFamily: FONT.hand, fontSize: 20, lineHeight: 22, color: col(palette.ink) }}
          />
          <TextWidget
            text={story.ago}
            maxLines={1}
            truncate="END"
            style={{ fontFamily: FONT.bodySemiBold, fontSize: 12, color: col(palette.inkMuted) }}
          />
          {caption ? (
            <TextWidget
              text={caption}
              maxLines={2}
              truncate="END"
              allowFontScaling={false}
              style={{
                fontFamily: FONT.hand,
                fontSize: 14,
                lineHeight: 16,
                color: col(palette.ink),
                marginTop: 4,
              }}
            />
          ) : null}
        </FlexWidget>
      </FlexWidget>
    </WidgetSheet>
  );
}

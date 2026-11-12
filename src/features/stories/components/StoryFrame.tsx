import { Image } from 'expo-image';
import { memo, type ReactNode } from 'react';
import { Text as RNText, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CANVAS_H, CANVAS_W, strokePath, type Stroke } from '@/lib/drawing';
import type { Fruit } from '@/lib/fruits';
import { imageCacheKey, remoteImageSource } from '@/lib/imageCache';
import type { StoryBg, StoryFont, StoryKind, StorySticker } from '@/lib/stories';
import { useTheme, type Theme } from '@/theme';

import {
  CAPTION_SCRIM,
  CAPTION_TEXT,
  NEUTRAL_BG,
  storyBgColor,
  storyTextColor,
  strokeHex,
} from './palette';

export { storyBgColor, storyTextColor } from './palette';

/** Lo mínimo de una story para dibujarla (la fila de la BD y el borrador de "crear" lo cumplen). */
export type FrameStory = {
  kind: StoryKind | string;
  text?: string | null;
  bg?: StoryBg | string | null;
  font?: StoryFont | string | null;
  strokes?: unknown;
  stickers?: unknown;
};

type Props = {
  story: FrameStory;
  /** Ancho del marco en dp; el alto es 16/9 de eso (9:16). */
  width: number;
  /** Foto ya resuelta (URL firmada o archivo local) para `photo`. */
  mediaUrl?: string | null;
  /** Pie de la foto (si no se da, se usa el `text` de la story). */
  caption?: string | null;
  /** Fruta de quien publicó: es el color de sus stickers. Por defecto, la tuya. */
  fruit?: Fruit;
  /** En `text`, reemplaza al texto (el editor mete aquí su `TextInput`). */
  children?: ReactNode;
};

const REFERENCE_WIDTH = 360;

/** Tamaño de letra (a 360 dp de ancho) según el largo del texto: entre más, más chica. */
export function storyFontSize(length: number): number {
  if (length <= 40) return 40;
  if (length <= 100) return 32;
  if (length <= 180) return 26;
  return 21;
}

/** Estilo del texto de una story de texto en un marco de `width` dp (lo usa también el editor). */
export function storyTextStyle(
  story: Pick<FrameStory, 'bg' | 'font'>,
  length: number,
  width: number,
  theme: { fonts: Theme['fonts'] },
) {
  const { fonts } = theme;
  const family =
    story.font === 'body'
      ? fonts.textSemi
      : story.font === 'stamp'
        ? fonts.textBold
        : fonts.display;
  const factor = story.font === 'body' || story.font === 'stamp' ? 0.8 : 1;
  const fontSize = Math.round(storyFontSize(length) * (width / REFERENCE_WIDTH) * factor);
  return {
    color: storyTextColor(story.bg),
    fontFamily: family,
    fontSize,
    lineHeight: Math.round(fontSize * 1.2),
    textAlign: 'center' as const,
  };
}

export function asStickers(value: unknown): StorySticker[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (s): s is StorySticker =>
      !!s && typeof s === 'object' && typeof (s as StorySticker).e === 'string',
  );
}

function asStrokes(value: unknown): Stroke[] {
  return Array.isArray(value) ? (value as Stroke[]) : [];
}

/** Trazos terminados: se memoriza para no repintar 300 paths en cada punto del trazo en curso. */
export const StrokesSvg = memo(function StrokesSvg({
  strokes,
  width,
}: {
  strokes: Stroke[];
  width: number;
  /** @deprecated Los trazos usan colores fijos de fruta; se ignora. */
  colors?: unknown;
}) {
  return (
    <Svg
      width={width}
      height={(width * CANVAS_H) / CANVAS_W}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      pointerEvents="none"
    >
      {strokes.map((s, i) => (
        <Path
          key={i}
          d={strokePath(s.p)}
          stroke={strokeHex(s.c)}
          strokeOpacity={s.o ?? 1}
          strokeWidth={s.w}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
});

/** Medida de un sticker (en dp) según el ancho del marco y su escala. */
export function stickerSize(width: number, scale: number) {
  const disc = width * 0.15 * scale;
  return { disc, box: disc * 1.2 };
}

/** Un sticker: círculo de la fruta de quien lo pone con el emoji (contenido) al centro. */
export function StickerDisc({ emoji, size, fruit }: { emoji: string; size: number; fruit: Fruit }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fruit.hex,
        borderWidth: Math.max(2, size * 0.05),
        borderColor: NEUTRAL_BG,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <RNText
        style={{ fontSize: size * 0.56, lineHeight: size * 0.68, textAlign: 'center' }}
        allowFontScaling={false}
      >
        {emoji}
      </RNText>
    </View>
  );
}

/** Stickers encima del marco: posición, escala y giro relativos. */
export function StickersView({
  stickers,
  width,
  fruit,
}: {
  stickers: StorySticker[];
  width: number;
  fruit: Fruit;
}) {
  const height = (width * CANVAS_H) / CANVAS_W;
  return (
    <>
      {stickers.map((s, i) => {
        const { disc, box } = stickerSize(width, s.s);
        return (
          <View
            key={`${s.e}-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: s.x * width - box / 2,
              top: s.y * height - box / 2,
              width: box,
              height: box,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: `${s.r}deg` }],
            }}
          >
            <StickerDisc emoji={s.e} size={disc} fruit={fruit} />
          </View>
        );
      })}
    </>
  );
}

/**
 * Una story dibujada en un marco 9:16 a cualquier ancho: foto con pie, texto sobre una fruta, o
 * dibujo vectorial; con stickers encima (DISENO §7).
 */
export function StoryFrame({ story, width, mediaUrl, caption, fruit, children }: Props) {
  const { fonts, radius, fruit: mine } = useTheme();
  const height = (width * CANVAS_H) / CANVAS_W;
  const scale = width / REFERENCE_WIDTH;
  const bg = storyBgColor(story.bg);
  const stickers = asStickers(story.stickers);
  const text = story.text ?? '';
  const label = caption ?? (story.kind === 'photo' ? text || null : null);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={
        story.kind === 'text'
          ? `Story de texto: ${text}`
          : story.kind === 'drawing'
            ? 'Story con un dibujo'
            : (label ?? 'Story con una foto')
      }
      style={{
        width,
        height,
        backgroundColor: story.kind === 'photo' ? CAPTION_SCRIM : bg,
        overflow: 'hidden',
        borderRadius: Math.min(radius.card, width * 0.08),
      }}
    >
      {story.kind === 'photo' && mediaUrl ? (
        <Image
          source={remoteImageSource(mediaUrl)}
          cachePolicy="memory-disk"
          recyclingKey={imageCacheKey(mediaUrl)}
          style={{ position: 'absolute', width, height }}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}

      {story.kind === 'drawing' ? (
        <View style={{ position: 'absolute', left: 0, top: 0 }}>
          <StrokesSvg strokes={asStrokes(story.strokes)} width={width} />
        </View>
      ) : null}

      {story.kind === 'text' ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            paddingHorizontal: width * 0.1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children ?? (
            <RNText style={storyTextStyle(story, text.length, width, { fonts })}>{text}</RNText>
          )}
        </View>
      ) : null}

      {story.kind === 'photo' && label ? (
        <View
          style={{
            position: 'absolute',
            left: width * 0.06,
            right: width * 0.06,
            bottom: height * 0.07,
            alignItems: 'flex-start',
          }}
        >
          <View
            style={{
              backgroundColor: CAPTION_SCRIM,
              paddingHorizontal: 12 * scale,
              paddingVertical: 8 * scale,
              maxWidth: '100%',
              borderRadius: 14 * scale,
            }}
          >
            <RNText
              style={{
                color: CAPTION_TEXT,
                fontFamily: fonts.textSemi,
                fontSize: Math.max(14, Math.round(18 * scale)),
                lineHeight: Math.max(20, Math.round(24 * scale)),
              }}
            >
              {label}
            </RNText>
          </View>
        </View>
      ) : null}

      <StickersView stickers={stickers} width={width} fruit={fruit ?? mine.me} />
    </View>
  );
}

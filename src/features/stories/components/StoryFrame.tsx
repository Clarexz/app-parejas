import { Image } from 'expo-image';
import { memo, type ReactNode } from 'react';
import { Text as RNText, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CANVAS_H, CANVAS_W, strokePath, type Stroke } from '@/lib/drawing';
import type { StoryBg, StoryFont, StoryKind, StorySticker } from '@/lib/stories';
import { useTheme, type Colors, type Theme } from '@/theme';

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
  /** En `text`, reemplaza al texto (el editor mete aquí su `TextInput`). */
  children?: ReactNode;
};

const REFERENCE_WIDTH = 360;

/** Fondo del tema para cada fondo de story. */
export function storyBgColor(bg: string | null | undefined, colors: Colors): string {
  switch (bg) {
    case 'postit':
      return colors.postit;
    case 'jamaica':
      return colors.jamaica;
    case 'cempasuchil':
      return colors.cempasuchil;
    case 'nopal':
      return colors.nopal;
    case 'ink':
      return colors.ink;
    case 'paper':
    default:
      return colors.paper;
  }
}

/**
 * Color del texto sobre cada fondo, con contraste >= 4.5:1 en claro y oscuro (hay prueba):
 * tinta sobre papel; `onPostit`/`onJamaica` sobre su color; sobre cempasúchil, `onPolaroid`
 * (en la noche `ink` es claro y no alcanza); sobre `ink`, `onJamaica` (se invierte con el modo).
 */
export function storyTextColor(bg: string | null | undefined, colors: Colors): string {
  switch (bg) {
    case 'postit':
      return colors.onPostit;
    case 'jamaica':
    case 'nopal':
    case 'ink':
      return colors.onJamaica;
    case 'cempasuchil':
      return colors.onPolaroid;
    case 'paper':
    default:
      return colors.ink;
  }
}

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
  theme: { colors: Colors; fonts: Theme['fonts'] },
) {
  const { colors, fonts } = theme;
  const family =
    story.font === 'body'
      ? fonts.bodySemiBold
      : story.font === 'stamp'
        ? fonts.monoBold
        : fonts.hand;
  const factor = story.font === 'body' ? 0.78 : story.font === 'stamp' ? 0.68 : 1;
  const fontSize = Math.round(storyFontSize(length) * (width / REFERENCE_WIDTH) * factor);
  return {
    color: storyTextColor(story.bg, colors),
    fontFamily: family,
    fontSize,
    lineHeight: Math.round(fontSize * 1.25),
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
  colors,
  width,
}: {
  strokes: Stroke[];
  colors: Colors;
  width: number;
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
          stroke={colors[s.c] ?? colors.ink}
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

/** Stickers (emojis) encima del marco: posición, escala y giro relativos. */
export function StickersView({ stickers, width }: { stickers: StorySticker[]; width: number }) {
  const height = (width * CANVAS_H) / CANVAS_W;
  return (
    <>
      {stickers.map((s, i) => {
        const size = width * 0.13 * s.s;
        const box = size * 1.4;
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
            <RNText style={{ fontSize: size, lineHeight: size * 1.2 }} allowFontScaling={false}>
              {s.e}
            </RNText>
          </View>
        );
      })}
    </>
  );
}

/**
 * Una story dibujada en un marco 9:16 a cualquier ancho: foto con pie a mano, texto sobre un
 * fondo de la paleta, o dibujo vectorial; con stickers encima (DISENO §7).
 */
export function StoryFrame({ story, width, mediaUrl, caption, children }: Props) {
  const { colors, fonts, radius } = useTheme();
  const height = (width * CANVAS_H) / CANVAS_W;
  const scale = width / REFERENCE_WIDTH;
  const bg = storyBgColor(story.bg, colors);
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
        backgroundColor: story.kind === 'photo' ? colors.photoEmpty : bg,
        overflow: 'hidden',
        borderRadius: radius.none,
      }}
    >
      {story.kind === 'photo' && mediaUrl ? (
        <Image
          source={{ uri: mediaUrl }}
          style={{ position: 'absolute', width, height }}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}

      {story.kind === 'drawing' ? (
        <View style={{ position: 'absolute', left: 0, top: 0 }}>
          <StrokesSvg strokes={asStrokes(story.strokes)} colors={colors} width={width} />
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
            <RNText style={storyTextStyle(story, text.length, width, { colors, fonts })}>
              {text}
            </RNText>
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
              backgroundColor: colors.polaroid,
              paddingHorizontal: 10 * scale,
              paddingVertical: 6 * scale,
              maxWidth: '100%',
              transform: [{ rotate: '-1deg' }],
              boxShadow: `0 ${4 * scale}px ${8 * scale}px -${3 * scale}px ${colors.shadow}`,
            }}
          >
            <RNText
              style={{
                color: colors.onPolaroid,
                fontFamily: fonts.hand,
                fontSize: Math.round(22 * scale),
                lineHeight: Math.round(25 * scale),
              }}
            >
              {label}
            </RNText>
          </View>
        </View>
      ) : null}

      <StickersView stickers={stickers} width={width} />
    </View>
  );
}

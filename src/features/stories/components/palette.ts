// Colores de las stories (DISENO §2.2): los fondos de texto son frutas y los trazos del dibujo
// salen de las mismas frutas. Las claves guardadas en la base (`bg`, `c`) son las de siempre; aquí
// solo se decide cómo se ven. Los colores son fijos: la story se ve igual en claro y en oscuro.

import type { StrokeColor } from '@/lib/drawing';
import { FRUITS, type Fruit } from '@/lib/fruits';
import type { StoryBg, StoryFont } from '@/lib/stories';
import { darkColors, lightColors } from '@/theme';

/** Hueso: el fondo neutro (lienzo en blanco). */
export const NEUTRAL_BG = lightColors.bg;
export const NEUTRAL_ON = lightColors.ink;

const BG_FRUIT: Record<Exclude<StoryBg, 'paper'>, Fruit> = {
  postit: FRUITS.sandia,
  jamaica: FRUITS.pitaya,
  cempasuchil: FRUITS.mango,
  nopal: FRUITS.limon,
  ink: FRUITS.mandarina,
};

/** Fondos que se ofrecen al crear, en orden. `paper` es el lienzo neutro. */
export const BG_OPTIONS: readonly StoryBg[] = [
  'paper',
  'postit',
  'cempasuchil',
  'nopal',
  'jamaica',
  'ink',
];

/** Fruta de un fondo (null = neutro). */
export function storyBgFruit(bg: string | null | undefined): Fruit | null {
  return bg && bg in BG_FRUIT ? BG_FRUIT[bg as keyof typeof BG_FRUIT] : null;
}

export function storyBgColor(bg: string | null | undefined): string {
  return storyBgFruit(bg)?.hex ?? NEUTRAL_BG;
}

/** Texto sobre el fondo: `fruit.on` (Tinta u Hueso, contraste >= 4.5:1). */
export function storyTextColor(bg: string | null | undefined): string {
  return storyBgFruit(bg)?.on ?? NEUTRAL_ON;
}

export function storyBgName(bg: string): string {
  return storyBgFruit(bg)?.name ?? 'Hueso';
}

/** Fondo de texto que corresponde a una fruta (para arrancar con la tuya), si existe. */
export function bgForFruit(fruit: Fruit): StoryBg | null {
  const hit = (Object.entries(BG_FRUIT) as [StoryBg, Fruit][]).find(([, f]) => f.key === fruit.key);
  return hit ? hit[0] : null;
}

const STROKE: Record<StrokeColor, { hex: string; name: string }> = {
  ink: { hex: lightColors.ink, name: 'Tinta' },
  paper: { hex: lightColors.bg, name: 'Hueso' },
  chile: { hex: FRUITS.sandia.hex, name: FRUITS.sandia.name },
  cempasuchil: { hex: FRUITS.mango.hex, name: FRUITS.mango.name },
  postit: { hex: FRUITS.mandarina.hex, name: FRUITS.mandarina.name },
  nopal: { hex: FRUITS.limon.hex, name: FRUITS.limon.name },
  jamaica: { hex: FRUITS.arandano.hex, name: FRUITS.arandano.name },
  tapeMint: { hex: FRUITS.uva.hex, name: FRUITS.uva.name },
};

export function strokeHex(c: StrokeColor | string): string {
  return STROKE[c as StrokeColor]?.hex ?? lightColors.ink;
}
export function strokeName(c: StrokeColor): string {
  return STROKE[c].name;
}

/** Etiquetas de la letra (las de la lib hablaban de la libreta). */
export const FONT_LABELS: Record<StoryFont, string> = {
  hand: 'Titular',
  body: 'Normal',
  stamp: 'Grueso',
};

/** Velo oscuro fijo para pies de foto sobre la imagen. */
export const CAPTION_SCRIM = darkColors.scrim;
export const CAPTION_TEXT = darkColors.ink;

// Colores de las stories (DISENO §2.2): los fondos de texto son frutas y los trazos del dibujo
// salen de las mismas frutas. Las claves guardadas en la base (`bg`, `c`) son las de siempre; aquí
// solo se decide cómo se ven. Los colores son fijos: la story se ve igual en claro y en oscuro.

import type { StrokeColor } from '@/lib/drawing';
import { FRUITS, isFruitKey, type Fruit } from '@/lib/fruits';
import { STORY_BGS, type StoryBg, type StoryFont } from '@/lib/stories';
import { darkColors, lightColors } from '@/theme';

/** Hueso: el fondo neutro (lienzo en blanco). */
export const NEUTRAL_BG = lightColors.bg;
export const NEUTRAL_ON = lightColors.ink;

/** Claves viejas de fondo y la fruta que pintan (las stories nuevas guardan la llave de fruta). */
const LEGACY_BG_FRUIT: Record<string, Fruit> = {
  postit: FRUITS.sandia,
  jamaica: FRUITS.pitaya,
  cempasuchil: FRUITS.mango,
  nopal: FRUITS.limon,
  ink: FRUITS.mandarina,
};

/** Fondos que se ofrecen al crear, en orden. `bone` es el lienzo neutro (Hueso). */
export const BG_OPTIONS: readonly StoryBg[] = STORY_BGS;

/** Fruta de un fondo (null = neutro). */
export function storyBgFruit(bg: string | null | undefined): Fruit | null {
  if (!bg) return null;
  if (isFruitKey(bg)) return FRUITS[bg];
  return LEGACY_BG_FRUIT[bg] ?? null;
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

/** Fondo de texto que corresponde a una fruta (para arrancar con la tuya): su propia llave. */
export function bgForFruit(fruit: Fruit): StoryBg {
  return fruit.key;
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

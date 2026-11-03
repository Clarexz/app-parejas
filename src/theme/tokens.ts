// Tokens del sistema "ahorita" (docs/DISENO.md §2). Única fuente de colores, tipos, espaciado,
// radios, elevación y movimiento: las pantallas y componentes solo los consumen vía useTheme().
// Las frutas viven en `src/lib/fruits.ts` (dominio) y llegan al tema como `theme.fruit`.

import { FRUITS } from '@/lib/fruits';

// ---------------------------------------------------------------------------------------------
// Color neutro (§2.1)

const baseLight = {
  /** Hueso: fondo de toda pantalla. */
  bg: '#FFFDF8',
  /** Arena: tarjetas, inputs, filas agrupadas. */
  surface: '#F4EFE3',
  /** Arena 2: chips, botón secundario, cosas dentro de una tarjeta. */
  surface2: '#EAE3D3',
  /** Tinta: texto e íconos. */
  ink: '#1B1B1F',
  /** Grafito: texto secundario. */
  inkMuted: '#5E5E66',
  /** Divisores de 1 dp (Tinta 10 %). */
  line: 'rgba(27,27,31,0.10)',
  /** Botón principal (D99). */
  action: '#1B1B1F',
  onAction: '#FFFDF8',
  scrim: 'rgba(27,27,31,0.40)',
  /** Chile: errores y acciones destructivas. Siempre con ícono y texto. */
  danger: '#B3261E',
  /** Nopal: confirmaciones. Siempre con ícono y texto. */
  success: '#1D7A4A',
  /** `danger` legible sobre `ink` (Toast): el valor del modo contrario. */
  dangerOnInk: '#FF8A80',
  /** `success` legible sobre `ink` (Toast): el valor del modo contrario. */
  successOnInk: '#6BD49A',
};

export type BaseColors = typeof baseLight;

const baseDark: BaseColors = {
  bg: '#141417',
  surface: '#1F1F24',
  surface2: '#2A2A31',
  ink: '#FFFDF8',
  inkMuted: '#A3A1A8',
  line: 'rgba(255,253,248,0.10)',
  action: '#FFFDF8',
  onAction: '#1B1B1F',
  scrim: 'rgba(0,0,0,0.60)',
  danger: '#FF8A80',
  success: '#6BD49A',
  dangerOnInk: '#B3261E',
  successOnInk: '#1D7A4A',
};

/**
 * Nombres de la Bitácora que las pantallas actuales todavía usan. Apuntan al valor nuevo más
 * cercano; se borran cuando se rediseñe la última pantalla que los consuma.
 */
export type LegacyColors = {
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `bg`). */
  paper: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `surface`). */
  paperRaised: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `inkMuted`). */
  inkFaint: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `line`). */
  grid: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `line`). */
  margin: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `line`). */
  ruled: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `action`). */
  jamaica: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `onAction`). */
  onJamaica: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa una fruta). */
  cempasuchil: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `success`). */
  nopal: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `danger`). */
  chile: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `surface2`). */
  postit: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `ink`). */
  onPostit: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `surface`). */
  polaroid: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `ink`). */
  onPolaroid: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `surface2`). */
  photoEmpty: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `surface2`). */
  tapeYellow: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `surface2`). */
  tapeMint: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `surface2`). */
  tapePink: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `scrim`). */
  shadow: string;
};

export type Colors = BaseColors & LegacyColors;

function withLegacy(base: BaseColors): Colors {
  return {
    ...base,
    paper: base.bg,
    paperRaised: base.surface,
    inkFaint: base.inkMuted,
    grid: base.line,
    margin: base.line,
    ruled: base.line,
    jamaica: base.action,
    onJamaica: base.onAction,
    cempasuchil: FRUITS.mango.hex,
    nopal: base.success,
    chile: base.danger,
    postit: base.surface2,
    onPostit: base.ink,
    polaroid: base.surface,
    onPolaroid: base.ink,
    photoEmpty: base.surface2,
    tapeYellow: base.surface2,
    tapeMint: base.surface2,
    tapePink: base.surface2,
    shadow: base.scrim,
  };
}

export const lightColors: Colors = withLegacy(baseLight);
export const darkColors: Colors = withLegacy(baseDark);

/** Mezcla de la fruta sobre `bg` para respuestas y burbujas (§2.2): 22 % claro, 16 % oscuro. */
export const TINT_AMOUNT = { light: 0.22, dark: 0.16 } as const;

// ---------------------------------------------------------------------------------------------
// Tipografía (§2.4)

/** Nombres de familia tal como los registra `useFonts` en `_layout.tsx`. */
export const fonts = {
  /** Bricolage Grotesque ExtraBold: display, títulos y números. */
  display: 'BricolageGrotesque_800ExtraBold',
  text: 'AlbertSans_400Regular',
  textMedium: 'AlbertSans_500Medium',
  textSemi: 'AlbertSans_600SemiBold',
  textBold: 'AlbertSans_700Bold',

  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `display`). */
  hand: 'BricolageGrotesque_800ExtraBold',
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `text`). */
  body: 'AlbertSans_400Regular',
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `textMedium`). */
  bodyMedium: 'AlbertSans_500Medium',
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `textSemi`). */
  bodySemiBold: 'AlbertSans_600SemiBold',
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `textBold`). */
  bodyBold: 'AlbertSans_700Bold',
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `text`). */
  mono: 'AlbertSans_400Regular',
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `textBold`). */
  monoBold: 'AlbertSans_700Bold',
} as const;

export type FontName = (typeof fonts)[keyof typeof fonts];

export type TypeStyle = {
  fontFamily: FontName;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'uppercase';
  fontVariant?: ('tabular-nums' | 'lining-nums')[];
};

const tabular: TypeStyle['fontVariant'] = ['tabular-nums'];

const scale = {
  display: {
    fontFamily: fonts.display,
    fontSize: 56,
    lineHeight: 58,
    letterSpacing: -1.68,
    fontVariant: tabular,
  },
  h1: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1 },
  h2: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.56 },
  h3: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.33 },
  num: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.64,
    fontVariant: tabular,
  },
  body: { fontFamily: fonts.text, fontSize: 18, lineHeight: 26 },
  bodyStrong: { fontFamily: fonts.textBold, fontSize: 18, lineHeight: 26 },
  ui: { fontFamily: fonts.textSemi, fontSize: 16, lineHeight: 22 },
  note: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20 },
  label: {
    fontFamily: fonts.textSemi,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TypeStyle>;

/** Variantes de la Bitácora → la más cercana del sistema nuevo. */
const legacyType = {
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `display`). */
  hero: scale.display,
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `h2`). */
  title: scale.h2,
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `ui`). */
  hand: scale.ui,
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `ui`). */
  handSmall: { ...scale.ui, fontSize: 14, lineHeight: 20 },
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `h3`). */
  heading: scale.h3,
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `note`). */
  small: scale.note,
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `note`). */
  caption: scale.note,
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `label`). */
  stamp: scale.label,
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `note`). */
  mono: scale.note,
} satisfies Record<string, TypeStyle>;

export const type = { ...scale, ...legacyType };

export type TypeVariant = keyof typeof type;

// ---------------------------------------------------------------------------------------------
// Espaciado, radios, elevación (§2.5)

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

/** Gutter de pantalla y separación entre bloques (§2.5). */
export const page = {
  gutter: 20,
  block: 24,
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `gutter`). */
  grid: 14,
  /** @deprecated Bitácora: se quita al rediseñar pantallas. */
  marginX: 32,
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `gutter`). */
  contentLeft: 20,
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `gutter`). */
  contentRight: 20,
};

export const radius = {
  /** Chips, inputs chicos. */
  sm: 12,
  /** Avisos, comentarios. */
  md: 18,
  /** Tarjetas y fotos. */
  card: 24,
  /** Hojas. */
  sheet: 28,
  /** Botones, segmentos, avatares. */
  pill: 999,
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `card`). */
  none: 24,
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `sm`). */
  xs: 12,
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `pill`). */
  hand: { tl: 999, tr: 999, br: 999, bl: 999 },
};

/** Inclinaciones de la Bitácora. @deprecated Bitácora: ya nada se inclina. */
export const tilt = [-3, -2, -1, 0, 1, 2, 3] as const;

// ---------------------------------------------------------------------------------------------
// Movimiento (§5)

export const motion = {
  /** Presionar botones y tarjetas. */
  tap: { duration: 120, scale: 0.97 },
  /** Cambios de estado y fundidos. */
  base: { duration: 220, bezier: [0.2, 0.8, 0.2, 1] as const },
  /** Salidas. */
  exit: { duration: 160, bezier: [0.42, 0, 1, 1] as const },
  /** Lo que "llega": pestaña activa, símbolo, racha (un rebote). */
  spring: { damping: 14, stiffness: 180 },
  /** Con "reducir movimiento" todo es un fundido de esta duración. */
  reduced: 150,

  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `tap`/`base`/`exit`). */
  duration: { fast: 120, base: 220, slow: 420 },
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `spring`). */
  springStick: { damping: 12, stiffness: 180, mass: 0.8 },
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `spring`). */
  springSoft: { damping: 18, stiffness: 140 },
};

/**
 * Sin sombras en tarjetas (§2.5): solo `Sheet` y `Toast` flotan (`float`). Los demás nombres son
 * de la Bitácora y no pintan nada.
 */
export function makeShadows(colors: Colors) {
  const none = '0 0 0 0 transparent';
  return {
    float: `0 8px 24px -8px ${colors.scrim}`,
    /** @deprecated Bitácora: se quita al rediseñar pantallas. */
    object: none,
    /** @deprecated Bitácora: se quita al rediseñar pantallas. */
    lifted: none,
    /** @deprecated Bitácora: se quita al rediseñar pantallas. */
    ink: none,
  };
}

export type Shadows = ReturnType<typeof makeShadows>;

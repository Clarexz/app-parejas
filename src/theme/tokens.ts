// Tokens del sistema "Bitácora" (docs/DISENO.md §2). Única fuente de colores, tipos,
// espaciado, radios, sombras y movimiento: las pantallas solo los consumen vía useTheme().

export const lightColors = {
  paper: '#F7F4EC',
  paperRaised: '#FFFDF7',
  ink: '#1E3270',
  inkMuted: '#5F6690',
  inkFaint: '#9AA0BF',
  grid: 'rgba(74,120,190,0.16)',
  margin: 'rgba(214,64,84,0.42)',
  ruled: 'rgba(74,120,190,0.28)',
  jamaica: '#C23B6B',
  onJamaica: '#FFFDF7',
  cempasuchil: '#E8932A',
  nopal: '#4F7A4A',
  chile: '#B3261E',
  postit: '#FFE27A',
  onPostit: '#3B2F12',
  polaroid: '#FFFEFA',
  onPolaroid: '#1E3270',
  tapeYellow: 'rgba(242,169,59,0.60)',
  tapeMint: 'rgba(110,190,165,0.60)',
  tapePink: 'rgba(194,59,107,0.45)',
  shadow: 'rgba(60,40,10,0.20)',
  scrim: 'rgba(30,50,112,0.35)',
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  paper: '#23201B',
  paperRaised: '#2E2A24',
  ink: '#EDE6D6',
  inkMuted: '#ACA390',
  inkFaint: '#6F685C',
  grid: 'rgba(237,230,214,0.06)',
  margin: 'rgba(232,106,122,0.30)',
  ruled: 'rgba(237,230,214,0.12)',
  jamaica: '#EC7397',
  onJamaica: '#23201B',
  cempasuchil: '#F2B25A',
  nopal: '#92BA84',
  chile: '#F2867A',
  postit: '#D6B34E',
  onPostit: '#2A2208',
  polaroid: '#DDD4C2',
  onPolaroid: '#2A2620',
  tapeYellow: 'rgba(242,169,59,0.50)',
  tapeMint: 'rgba(110,190,165,0.45)',
  tapePink: 'rgba(232,105,143,0.45)',
  shadow: 'rgba(0,0,0,0.50)',
  scrim: 'rgba(0,0,0,0.55)',
};

/** Nombres de familia tal como los registra `useFonts` en `_layout.tsx`. */
export const fonts = {
  hand: 'GochiHand_400Regular',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemiBold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
  mono: 'CourierPrime_400Regular',
  monoBold: 'CourierPrime_700Bold',
} as const;

export type FontName = (typeof fonts)[keyof typeof fonts];

export type TypeStyle = {
  fontFamily: FontName;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'uppercase';
};

export const type = {
  hero: { fontFamily: fonts.hand, fontSize: 56, lineHeight: 52 },
  display: { fontFamily: fonts.hand, fontSize: 40, lineHeight: 40 },
  title: { fontFamily: fonts.hand, fontSize: 28, lineHeight: 30 },
  hand: { fontFamily: fonts.hand, fontSize: 20, lineHeight: 22 },
  handSmall: { fontFamily: fonts.hand, fontSize: 16, lineHeight: 18 },
  heading: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12.5, lineHeight: 16 },
  stamp: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mono: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 17 },
} satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof type;

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

/** Geometría de la hoja de cuaderno. */
export const page = { grid: 14, marginX: 32, contentLeft: 44, contentRight: 20 };

export const radius = {
  none: 0,
  xs: 2,
  sm: 6,
  pill: 999,
  /** Botón primario "recortado a mano": radios por esquina. */
  hand: { tl: 18, tr: 6, br: 16, bl: 8 },
};

/** Inclinaciones permitidas, en grados. */
export const tilt = [-3, -2, -1, 0, 1, 2, 3] as const;

export const motion = {
  duration: { fast: 120, base: 220, slow: 420 },
  springStick: { damping: 12, stiffness: 180, mass: 0.8 },
  springSoft: { damping: 18, stiffness: 140 },
};

/** Sombras cortas y cálidas (strings `boxShadow` de RN) según los colores del tema. */
export function makeShadows(colors: Colors) {
  return {
    object: `0 4px 8px -3px ${colors.shadow}`,
    lifted: `0 10px 18px -8px ${colors.shadow}`,
    ink: `2px 3px 0 ${colors.ink}`,
  };
}

export type Shadows = ReturnType<typeof makeShadows>;

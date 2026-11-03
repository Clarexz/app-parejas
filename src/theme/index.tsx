import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { DEFAULT_FRUITS, FRUITS, tint, type Fruit, type FruitKey } from '@/lib/fruits';

import {
  TINT_AMOUNT,
  darkColors,
  fonts,
  lightColors,
  makeShadows,
  motion,
  page,
  radius,
  spacing,
  type,
  type Colors,
  type Shadows,
} from './tokens';

export * from './tokens';

export type FruitSelection = { me: FruitKey; partner: FruitKey | null };

export type Theme = {
  isDark: boolean;
  colors: Colors;
  type: typeof type;
  spacing: typeof spacing;
  page: typeof page;
  radius: typeof radius;
  shadows: Shadows;
  motion: typeof motion;
  fonts: typeof fonts;
  /** Frutas efectivas: `me` es tu color; `partner` el de tu pareja (null si aún no hay). */
  fruit: { me: Fruit; partner: Fruit | null };
  /** Tinte de una fruta sobre `bg` (22 % claro, 16 % oscuro) para respuestas y burbujas. */
  tint: (fruit: Fruit) => string;
};

const ThemeContext = createContext<Theme | null>(null);

const DEFAULT_SELECTION: FruitSelection = { me: DEFAULT_FRUITS[0], partner: DEFAULT_FRUITS[1] };

/**
 * `scheme` fuerza claro u oscuro en una parte del árbol (el visor de stories siempre es "de
 * noche"); sin él se sigue el modo del sistema. `fruits` son las frutas ya resueltas
 * (`resolveFruits`); sin ellas, Sandía para ti y Mango para tu pareja.
 */
export function ThemeProvider({
  children,
  scheme,
  fruits,
}: {
  children: ReactNode;
  scheme?: 'light' | 'dark';
  fruits?: FruitSelection;
}) {
  const system = useColorScheme();
  const parent = useContext(ThemeContext);
  const isDark = (scheme ?? system) === 'dark';
  // Un ThemeProvider anidado (el visor de stories) hereda las frutas del de arriba.
  const inherited: FruitSelection = parent
    ? { me: parent.fruit.me.key, partner: parent.fruit.partner?.key ?? null }
    : DEFAULT_SELECTION;
  const meKey = (fruits ?? inherited).me;
  const partnerKey = (fruits ?? inherited).partner;
  const theme = useMemo<Theme>(() => {
    const colors = isDark ? darkColors : lightColors;
    const amount = isDark ? TINT_AMOUNT.dark : TINT_AMOUNT.light;
    return {
      isDark,
      colors,
      type,
      spacing,
      page,
      radius,
      shadows: makeShadows(colors),
      motion,
      fonts,
      fruit: { me: FRUITS[meKey], partner: partnerKey ? FRUITS[partnerKey] : null },
      tint: (fruit: Fruit) => tint(fruit.hex, colors.bg, amount),
    };
  }, [isDark, meKey, partnerKey]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return theme;
}

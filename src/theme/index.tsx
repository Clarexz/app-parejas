import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
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
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo<Theme>(() => {
    const colors = isDark ? darkColors : lightColors;
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
    };
  }, [isDark]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return theme;
}

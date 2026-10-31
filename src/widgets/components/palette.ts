// Paleta, tipografías y utilidades compartidas de los widgets. Los widgets se dibujan fuera de
// React / ThemeProvider, así que importan los tokens directo (docs/DISENO.md §2).
import type { ColorProp } from 'react-native-android-widget';

import { APP_SCHEME } from '@/constants/app';
import { darkColors, lightColors, fonts, type Colors } from '@/theme/tokens';

import type { WidgetName } from '@/lib/widgets';
import { WIDGET_ROUTES } from '@/lib/widgets';

/** Ancho (dp) a partir del cual un widget se considera "mediano" (≈4×2). */
export const MEDIUM_MIN_WIDTH = 220;

export type WidgetSize = { width: number; height: number };

export type WidgetPalette = Colors & { isDark: boolean };

export const palettes: { light: WidgetPalette; dark: WidgetPalette } = {
  light: { ...lightColors, isDark: false },
  dark: { ...darkColors, isDark: true },
};

/** La librería tipa los colores con plantillas estrictas; los tokens ya son hex o rgba válidos. */
export const col = (value: string): ColorProp => value as ColorProp;

export const FONT = {
  hand: fonts.hand,
  body: fonts.body,
  bodyMedium: fonts.bodyMedium,
  bodySemiBold: fonts.bodySemiBold,
  bodyBold: fonts.bodyBold,
  monoBold: fonts.monoBold,
} as const;

export const isMedium = (size: WidgetSize): boolean => size.width >= MEDIUM_MIN_WIDTH;

/** Deep link de un widget: `appparejas://moods`, o `appparejas://` para el inicio. */
export function widgetUri(name: WidgetName, routeOverride?: string): string {
  const route = (routeOverride ?? WIDGET_ROUTES[name]).replace(/^\/+/, '');
  return `${APP_SCHEME}://${route}`;
}

/** Props de toque comunes a todo el widget. */
export function tapProps(name: WidgetName, label: string, route?: string) {
  return {
    clickAction: 'OPEN_URI' as const,
    clickActionData: { uri: widgetUri(name, route) },
    accessibilityLabel: label,
  };
}

export type WidgetProps = {
  name: WidgetName;
  palette: WidgetPalette;
  size: WidgetSize;
};

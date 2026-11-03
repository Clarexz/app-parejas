// Utilidades compartidas de los widgets. Los widgets se dibujan fuera de React / ThemeProvider;
// con el vidrio simulado ya no necesitan la paleta del tema: solo saber si el sistema está en oscuro.
import type { ColorProp } from 'react-native-android-widget';

import { APP_SCHEME } from '@/constants/app';
import type { WidgetName } from '@/lib/widgets';
import { WIDGET_ROUTES } from '@/lib/widgets';
import { fonts } from '@/theme/tokens';

export type WidgetSize = { width: number; height: number };

export type WidgetPalette = { isDark: boolean };

export const palettes: { light: WidgetPalette; dark: WidgetPalette } = {
  light: { isDark: false },
  dark: { isDark: true },
};

/** La librería tipa los colores con plantillas estrictas; aquí todos son hex o rgba válidos. */
export const col = (value: string): ColorProp => value as ColorProp;

export const FONT = {
  semiBold: fonts.bodySemiBold,
} as const;

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

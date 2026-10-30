// Android: dibuja el widget real con `renderWidget` dentro de `WidgetPreview` de la librería.
import { useCallback } from 'react';
import { View } from 'react-native';
import { WidgetPreview as LibraryPreview } from 'react-native-android-widget';

import { useTheme } from '@/theme';
import { renderWidget } from '@/widgets/render';

import type { WidgetPreviewProps } from './types';

export function WidgetPreview({ name, model, width, height }: WidgetPreviewProps) {
  const { isDark } = useTheme();
  const render = useCallback(
    (size: { width: number; height: number }) => {
      const out = renderWidget(name, model, size);
      if ('light' in out) return (isDark ? out.dark : null) ?? out.light;
      return out;
    },
    [name, model, isDark],
  );
  return (
    <View accessible accessibilityLabel={`Vista previa del widget ${name}`}>
      <LibraryPreview renderWidget={render} width={width} height={height} />
    </View>
  );
}

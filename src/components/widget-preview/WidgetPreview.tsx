// Web (solo QA visual): dibuja la misma forma SVG del widget real (`widgetShapeSvg`) como imagen
// y el dato debajo. En Android se usa `WidgetPreview.android.tsx`, que dibuja el widget de verdad.
import { Image, Text, View } from 'react-native';

import { useTheme } from '@/theme';
import { shapeSide, labelFontSize } from '@/widgets/components/WidgetFrame';
import { widgetShapeSvg, widgetView } from '@/widgets/view';

import { WALLPAPER, type WidgetPreviewProps } from './types';

export function WidgetPreview({ name, model, width, height }: WidgetPreviewProps) {
  const { isDark } = useTheme();
  const view = widgetView(name, model);
  const side = shapeSide(width, height);
  const svg = widgetShapeSvg(view, { dark: isDark, size: side, id: name });
  return (
    <View
      accessible
      accessibilityLabel={`Vista previa del widget ${name}. ${view.a11y}`}
      style={{
        width,
        height,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: WALLPAPER,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        source={{ uri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` }}
        style={{ width: side, height: side }}
        accessibilityElementsHidden
      />
      <Text
        numberOfLines={1}
        style={{
          width: '100%',
          marginTop: 2,
          textAlign: 'center',
          color: '#FFFFFF',
          fontWeight: '600',
          fontSize: labelFontSize(view.text),
          textShadowColor: 'rgba(0,0,0,0.65)',
          textShadowRadius: 3,
          textShadowOffset: { width: 0, height: 1 },
        }}
      >
        {view.text}
      </Text>
    </View>
  );
}

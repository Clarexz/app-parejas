import { useState } from 'react';
import { Text as RNText, View } from 'react-native';

import { FRUITS } from '@/lib/fruits';
import { useTheme } from '@/theme';

import { BrandSymbol, fruitHex, type FruitLike } from './Symbol';

type Props = {
  /** Tamaño de la letra, en dp. */
  size?: number;
  layout?: 'name' | 'horizontal' | 'stacked';
  left?: FruitLike;
  right?: FruitLike;
};

// Rendija de la "o": 8 % del ancho de la letra, como en el símbolo.
const GAP = 0.08;

/**
 * "ahorita" siempre en minúsculas (DISENO §3). La "o" se parte en las dos frutas con una rendija
 * de 8 %: dos copias de la letra recortadas a cada lado.
 */
export function Wordmark({ size = 26, layout = 'horizontal', left, right }: Props) {
  const { colors, fonts, fruit } = useTheme();
  const leftColor = fruitHex(left ?? fruit.me);
  const rightColor = fruitHex(right ?? fruit.partner ?? FRUITS[fruit.me.suggested]);
  // Ancho real de la "o": se mide una vez y se recorta con él.
  const [oWidth, setOWidth] = useState(size * 0.6);
  const lineHeight = Math.round(size * 1.1);
  const glyph = {
    fontFamily: fonts.display,
    fontSize: size,
    lineHeight,
    letterSpacing: -0.045 * size,
  };
  const half = (oWidth * (1 - GAP)) / 2;

  const name = (
    <View
      accessible
      accessibilityLabel="ahorita"
      accessibilityRole="image"
      style={{ flexDirection: 'row', height: lineHeight }}
    >
      <RNText allowFontScaling={false} style={[glyph, { color: colors.ink }]}>
        ah
      </RNText>
      <View style={{ width: oWidth, height: lineHeight }}>
        {/* Cada mitad recorta su propia copia de la "o"; la copia vive en un contenedor con el
            ancho completo para que el texto no se estreche ni se corte con puntos suspensivos. */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            width: half,
            height: lineHeight,
            overflow: 'hidden',
          }}
        >
          <View style={{ position: 'absolute', left: 0, width: oWidth + 16 }}>
            <RNText allowFontScaling={false} style={[glyph, { color: leftColor }]}>
              o
            </RNText>
          </View>
        </View>
        <View
          style={{
            position: 'absolute',
            left: oWidth - half,
            width: half,
            height: lineHeight,
            overflow: 'hidden',
          }}
        >
          <View style={{ position: 'absolute', left: -(oWidth - half), width: oWidth + 16 }}>
            <RNText allowFontScaling={false} style={[glyph, { color: rightColor }]}>
              o
            </RNText>
          </View>
        </View>
        {/* Medidor invisible de la "o". */}
        <RNText
          allowFontScaling={false}
          onLayout={(e) =>
            setOWidth(Math.max(1, Math.round(e.nativeEvent.layout.width * 100) / 100))
          }
          style={[glyph, { position: 'absolute', opacity: 0, letterSpacing: 0 }]}
        >
          o
        </RNText>
      </View>
      <RNText allowFontScaling={false} style={[glyph, { color: colors.ink }]}>
        rita
      </RNText>
    </View>
  );

  if (layout === 'name') return name;
  const symbolSize = Math.round(size * 1.15);
  if (layout === 'stacked') {
    return (
      <View style={{ alignItems: 'center', gap: size * 0.4 }}>
        <BrandSymbol size={symbolSize * 2} left={left} right={right} />
        {name}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.4 }}>
      <BrandSymbol size={symbolSize} left={left} right={right} />
      {name}
    </View>
  );
}

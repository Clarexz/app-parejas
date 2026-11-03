import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Text } from '@/components';
import { FRUITS } from '@/lib/fruits';
import { useTheme } from '@/theme';

type Props = {
  /** Cada quien comparte o no su ubicación: lleno = comparte, contorno = todavía no. */
  meActive: boolean;
  partnerActive: boolean;
  /** Más cerca, menos espacio entre los círculos (como el widget). */
  km: number | null;
  /** Inicial de cada quien dentro del círculo. */
  meInitial: string;
  partnerInitial: string;
  /** Versión chica para la tarjeta de Inicio. */
  compact?: boolean;
};

const DEFAULT_WIDTH = 320;
/** A partir de esta distancia el espacio entre círculos ya no crece. */
const FAR_KM = 1500;

/**
 * Los dos círculos —tú y tu pareja, en sus frutas— unidos por una ruta punteada, como el widget
 * de Distancia (DISENO §9). Si alguien no comparte, su círculo es solo contorno.
 */
export function DistanceRoute({
  meActive,
  partnerActive,
  km,
  meInitial,
  partnerInitial,
  compact = false,
}: Props) {
  const { colors, fruit } = useTheme();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const partnerFruit = fruit.partner ?? FRUITS[fruit.me.suggested];
  const r = compact ? 18 : 30;
  const height = r * 2 + 4;
  const cy = height / 2;
  // Espacio entre los centros: de 45 % a 100 % del ancho útil según qué tan lejos están.
  const span = width - r * 2 - 8;
  const share = km == null ? 1 : Math.min(1, Math.max(0.45, km / FAR_KM));
  const half = (span * share) / 2;
  const leftX = width / 2 - half;
  const rightX = width / 2 + half;
  const stroke = 3;

  const circle = (x: number, active: boolean, hex: string) =>
    active ? (
      <Circle cx={x} cy={cy} r={r} fill={hex} />
    ) : (
      <Circle
        cx={x}
        cy={cy}
        r={r - stroke / 2}
        fill="none"
        stroke={colors.line}
        strokeWidth={stroke}
        strokeDasharray={[2, 6]}
        strokeLinecap="round"
      />
    );

  const initialAt = (x: number, text: string, active: boolean, on: string) => (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        variant={compact ? 'ui' : 'h3'}
        style={{ color: active ? on : colors.inkMuted }}
        maxFontSizeMultiplier={1.2}
      >
        {text}
      </Text>
    </View>
  );

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}
      style={{ height }}
    >
      <Svg width={width} height={height}>
        <Line
          x1={leftX + r + 8}
          y1={cy}
          x2={rightX - r - 8}
          y2={cy}
          stroke={colors.inkMuted}
          strokeWidth={2}
          strokeDasharray={[2, 8]}
          strokeLinecap="round"
        />
        {circle(leftX, meActive, fruit.me.hex)}
        {circle(rightX, partnerActive, partnerFruit.hex)}
      </Svg>
      {initialAt(leftX, meInitial, meActive, fruit.me.on)}
      {initialAt(rightX, partnerInitial, partnerActive, partnerFruit.on)}
    </View>
  );
}

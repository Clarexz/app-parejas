// @deprecated Bitácora: se quitan al rediseñar pantallas. Ahora son adaptadores delgados al
// estilo nuevo (símbolo y formas de las frutas).
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { BrandSymbol } from '../Symbol';

type Size = { width?: number; height?: number };
export type SceneKind = 'hill' | 'sea' | 'city' | 'tacos';

function SymbolArt({ width = 160, height = 120 }: Size) {
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <BrandSymbol size={Math.min(width, height) * 0.8} />
    </View>
  );
}

/** @deprecated Bitácora: usa `EmptyState art="symbol"` o `Notice tone="danger"`. */
export const CloudOff = SymbolArt;
/** @deprecated Bitácora: usa `EmptyState art="bubble"`. */
export const PencilNote = SymbolArt;
/** @deprecated Bitácora: usa `EmptyState art="symbol"`. */
export const EmptyPolaroid = SymbolArt;
/** @deprecated Bitácora: usa `EmptyState art="circles"`. */
export const WaitingIllustration = SymbolArt;

/** @deprecated Bitácora: fondo liso de `surface2` con el símbolo, en lugar de una escena. */
export function Scene(_props: { kind: SceneKind }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
      ]}
    >
      <BrandSymbol size={48} />
    </View>
  );
}

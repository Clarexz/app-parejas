import { View } from 'react-native';

import { BrandSymbol } from './Symbol';

type Props = {
  size?: number;
  accessibilityLabel?: string;
  /** Mitades en estas frutas (por defecto, las de ustedes). */
  left?: Parameters<typeof BrandSymbol>[0]['left'];
  right?: Parameters<typeof BrandSymbol>[0]['right'];
};

/** Cargando: el símbolo respira, las mitades se separan 4 dp y regresan (DISENO §5). */
export function LoadingSymbol({ size = 48, accessibilityLabel = 'Cargando', left, right }: Props) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      <BrandSymbol size={size} animate="breathe" left={left} right={right} />
    </View>
  );
}

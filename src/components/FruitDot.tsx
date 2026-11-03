import { View } from 'react-native';

import { fruitHex, type FruitLike } from './Symbol';

type Props = {
  fruit: FruitLike;
  size?: number;
};

/** Punto de la fruta: "esto es de…" (DISENO §7). Decorativo: el nombre va en texto aparte. */
export function FruitDot({ fruit, size = 12 }: Props) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fruitHex(fruit),
      }}
    />
  );
}

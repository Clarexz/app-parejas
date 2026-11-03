import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { fruitOf, type FruitLike } from './Symbol';
import { Text } from './Text';

type Props = {
  /** Frase corta en display (manual §15): "te extraño". */
  text?: string;
  /** Fruta de quien lo pone; por defecto la tuya. */
  fruit?: FruitLike;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** Sticker de stories: círculo de fruta con una frase corta en display (DISENO §7). */
export function Sticker({ text, fruit, size = 96, style }: Props) {
  const { radius, fruit: mine } = useTheme();
  const chosen = fruitOf(fruit ?? mine.me);

  return (
    <View
      accessible
      accessibilityLabel={text}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: chosen.hex,
          alignItems: 'center',
          justifyContent: 'center',
          padding: size * 0.14,
        },
        style,
      ]}
    >
      <Text
        variant="h3"
        style={{
          color: chosen.on,
          textAlign: 'center',
          fontSize: Math.round(size * 0.2),
          lineHeight: Math.round(size * 0.23),
        }}
      >
        {text}
      </Text>
    </View>
  );
}

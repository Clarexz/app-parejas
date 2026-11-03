import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { fruitOf, type FruitLike } from './Symbol';
import { Text } from './Text';

type Props = {
  /** Frase corta en display (manual §15): "te extraño". */
  text?: string;
  /** Fruta de quien lo pone; por defecto la tuya. */
  fruit?: FruitLike;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** @deprecated Bitácora: se quita al rediseñar pantallas (usa `text`). */
  label?: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas. */
  icon?: IconName;
  /** @deprecated Bitácora: se quita al rediseñar pantallas. */
  emoji?: string;
  /** @deprecated Bitácora: se quita al rediseñar pantallas. */
  tone?: 'jamaica' | 'cempasuchil' | 'nopal' | 'postit';
  /** @deprecated Bitácora: se quita al rediseñar pantallas. Ya nada se inclina. */
  tilt?: number;
};

/** Sticker de stories: círculo de fruta con una frase corta en display (DISENO §7). */
export function Sticker({ text, fruit, size = 96, style, label, icon, emoji }: Props) {
  const { colors, spacing, radius, fruit: mine } = useTheme();
  const chosen = fruitOf(fruit ?? mine.me);

  // Adaptador de la Bitácora: etiquetas, íconos y emojis sueltos.
  if (!text) {
    return (
      <View
        style={[
          {
            alignSelf: 'flex-start',
            minHeight: 28,
            minWidth: 28,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            paddingHorizontal: spacing.sm,
            borderRadius: radius.pill,
            backgroundColor: colors.surface2,
          },
          style,
        ]}
      >
        {icon ? <Icon name={icon} size={16} color={colors.ink} /> : null}
        {emoji ? <Text variant="note">{emoji}</Text> : null}
        {label ? <Text variant="note">{label}</Text> : null}
      </View>
    );
  }

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

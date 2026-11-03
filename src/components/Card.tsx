import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { useTapScale } from './motion';

type Props = {
  children: ReactNode;
  /** `me`/`partner`: tinte de la fruta de quien lo escribió. */
  tone?: 'surface' | 'me' | 'partner';
  /** Si se pasa, la tarjeta es tocable y se achica al presionar. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** @deprecated Bitácora: se quita al rediseñar pantallas. Ya no hay renglones. */
  variant?: 'plain' | 'ruled';
  /** @deprecated Bitácora: se quita al rediseñar pantallas. Ya nada se inclina. */
  tilt?: number;
};

/** Superficie `surface`, radio 24, padding 18, sin sombra (DISENO §7). */
export function Card({ children, tone = 'surface', onPress, accessibilityLabel, style }: Props) {
  const { colors, spacing, radius, fruit, tint } = useTheme();
  const tap = useTapScale();
  const partner = fruit.partner;
  const backgroundColor =
    tone === 'me' ? tint(fruit.me) : tone === 'partner' && partner ? tint(partner) : colors.surface;
  const body = (
    <View
      style={[{ backgroundColor, borderRadius: radius.card, padding: 18, gap: spacing.sm }, style]}
    >
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={tap.onPressIn}
      onPressOut={tap.onPressOut}
    >
      <Animated.View style={tap.style}>{body}</Animated.View>
    </Pressable>
  );
}

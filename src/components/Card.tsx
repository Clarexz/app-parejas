import { useState, type ReactNode } from 'react';
import {
  Pressable,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  variant?: 'plain' | 'ruled';
  /** Inclinación en grados (fichas ±1, DISENO §2.6). */
  tilt?: number;
  /** Si se pasa, la ficha es tocable y se "levanta" al presionar. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Ficha bibliográfica: papel recto, borde superior de margen y sombra de objeto (DISENO §7). */
export function Card({
  children,
  variant = 'plain',
  tilt = 0,
  onPress,
  accessibilityLabel,
  style,
}: Props) {
  const { colors, spacing, radius, shadows, motion, type } = useTheme();
  const ruleStep = type.body.lineHeight;
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const [lifted, setLifted] = useState(false);
  const [height, setHeight] = useState(0);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.03 * press.value }] }));
  const set = (v: number) => {
    setLifted(v === 1);
    press.value = reduced ? v : withTiming(v, { duration: motion.duration.fast });
  };

  const rules = variant === 'ruled' ? Math.floor((height - spacing.lg) / ruleStep) : 0;
  const body = (
    <View
      onLayout={(e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height)}
      style={[
        {
          backgroundColor: colors.paperRaised,
          borderTopColor: colors.margin,
          borderTopWidth: 2,
          borderRadius: radius.none,
          padding: spacing.lg,
          gap: variant === 'ruled' ? 0 : spacing.sm,
          boxShadow: lifted ? shadows.lifted : shadows.object,
        },
        style,
      ]}
    >
      {Array.from({ length: rules }, (_, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            // El renglón queda ~4 dp bajo la línea base del texto, para que se "apoye" en él.
            top: spacing.lg + ruleStep * (i + 1) - 4,
            height: 1,
            backgroundColor: colors.ruled,
          }}
        />
      ))}
      {children}
    </View>
  );

  const tiltStyle = { transform: [{ rotate: `${tilt}deg` }] };
  if (!onPress) return <View style={tiltStyle}>{body}</View>;
  return (
    <View style={tiltStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={() => set(1)}
        onPressOut={() => set(0)}
      >
        <Animated.View style={animated}>{body}</Animated.View>
      </Pressable>
    </View>
  );
}

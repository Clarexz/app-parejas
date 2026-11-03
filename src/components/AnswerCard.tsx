import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { bezierOf } from './motion';
import { FruitDot } from './FruitDot';
import { fruitOf, type FruitLike } from './Symbol';
import { Text } from './Text';

type Props = {
  fruit: FruitLike;
  name: string;
  text?: string;
  /** Respuesta de tu pareja mientras no contestes: renglones borrosos. */
  locked?: boolean;
  lockedText?: string;
  /** Se anima al abrirse (§5): de 0.3 y +8 dp a nítida en 320 ms. */
  reveal?: boolean;
};

const LOCKED_BARS = [0.92, 0.78, 0.5];

/** Respuesta de una persona sobre el tinte de su fruta (DISENO §7). */
export function AnswerCard({
  fruit,
  name,
  text,
  locked = false,
  lockedText = 'Se abre cuando contestes.',
  reveal = false,
}: Props) {
  const { colors, spacing, radius, motion, tint } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(reveal ? 0 : 1);
  useEffect(() => {
    if (!reveal) return;
    progress.value = withTiming(1, {
      duration: reduced ? motion.reduced : 320,
      easing: bezierOf(motion.base),
    });
  }, [reveal, reduced, progress, motion]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * progress.value,
    transform: reduced ? [] : [{ translateY: 8 * (1 - progress.value) }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityLabel={
        locked ? `Respuesta de ${name}. ${lockedText}` : `Respuesta de ${name}: ${text ?? ''}`
      }
      style={[
        {
          backgroundColor: tint(fruitOf(fruit)),
          borderRadius: radius.card,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <FruitDot fruit={fruit} />
        <Text variant="ui">{name}</Text>
      </View>
      {locked ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ gap: spacing.sm, filter: 'blur(3px)', opacity: 0.55 }}>
            {LOCKED_BARS.map((w) => (
              <View
                key={w}
                style={{
                  width: `${w * 100}%`,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: colors.ink,
                }}
              />
            ))}
          </View>
          <Text variant="note" tone="muted">
            {lockedText}
          </Text>
        </View>
      ) : (
        <Text variant="body">{text}</Text>
      )}
    </Animated.View>
  );
}

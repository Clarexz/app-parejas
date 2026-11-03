import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { bezierOf } from './motion';
import { BrandSymbol } from './Symbol';
import { Text } from './Text';

type Props = {
  /** Frase corta que aparece cuando las mitades llegan. */
  text: string;
  /** Se llama solo (a los 2.2 s) o al tocar. Sin ella el velo no atrapa toques. */
  onDone?: () => void;
};

const SHOW_MS = 2200;

/**
 * La firma de la marca (DISENO §5): las dos mitades llegan desde fuera y se quedan sin tocarse,
 * y aparece una frase corta. Al contestar cuando ya contestaron los dos, o al completar algo
 * "de a dos". Háptica `success` al llegar. Con "reducir movimiento" solo se funde.
 */
export function ArrivalOverlay({ text, onDone }: Props) {
  const { colors, spacing, radius, motion } = useTheme();
  const reduced = useReducedMotion();
  const veil = useSharedValue(0);
  const phrase = useSharedValue(0);

  useEffect(() => {
    haptic.success();
    veil.value = withTiming(1, {
      duration: reduced ? motion.reduced : motion.base.duration,
      easing: bezierOf(motion.base),
    });
    phrase.value = withDelay(
      reduced ? 0 : 280,
      withTiming(1, { duration: reduced ? motion.reduced : motion.base.duration }),
    );
    if (!onDone) return;
    const timer = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timer);
  }, [reduced, motion, veil, phrase, onDone]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const phraseStyle = useAnimatedStyle(() => ({
    opacity: phrase.value,
    transform: reduced ? [] : [{ translateY: 8 * (1 - phrase.value) }],
  }));

  return (
    <Animated.View
      pointerEvents={onDone ? 'auto' : 'none'}
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: colors.scrim,
        },
        veilStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text}
        disabled={!onDone}
        onPress={onDone}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}
      >
        <View
          style={{
            alignItems: 'center',
            gap: spacing.lg,
            backgroundColor: colors.bg,
            borderRadius: radius.sheet,
            paddingVertical: spacing.xxl,
            paddingHorizontal: spacing.xl,
            minWidth: 240,
          }}
        >
          <BrandSymbol size={96} animate="arrive" />
          <Animated.View style={phraseStyle}>
            <Text variant="h2" style={{ textAlign: 'center' }}>
              {text}
            </Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

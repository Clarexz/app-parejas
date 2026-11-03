import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { bezierOf } from './motion';
import { Text } from './Text';

type Props = {
  open: boolean;
  /** Contenido real: solo se monta cuando `open` es true (privacidad). */
  children: ReactNode;
  lockedLabel?: string;
  onPress?: () => void;
};

const BARS = ['92%', '78%', '50%'] as const;

/**
 * @deprecated Bitácora: se quita al rediseñar pantallas (usa `AnswerCard`). Cerrada muestra
 * renglones borrosos; al abrirse el contenido se aclara (DISENO §5).
 */
export function FoldedNote({
  open,
  children,
  lockedLabel = 'Se abre cuando contestes.',
  onPress,
}: Props) {
  const { colors, spacing, radius, motion } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(open ? 1 : 0);
  const wasOpen = useRef(open);

  useEffect(() => {
    if (open === wasOpen.current) return;
    wasOpen.current = open;
    if (open) haptic.success();
    progress.value = withTiming(open ? 1 : 0, {
      duration: reduced ? motion.reduced : 320,
      easing: bezierOf(motion.base),
    });
  }, [open, reduced, motion, progress]);

  const reveal = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * progress.value,
    transform: reduced ? [] : [{ translateY: 8 * (1 - progress.value) }],
  }));

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={open ? undefined : lockedLabel}
    >
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          padding: spacing.lg,
        }}
      >
        {open ? (
          <Animated.View style={reveal}>{children}</Animated.View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <View style={{ gap: spacing.sm, filter: 'blur(3px)', opacity: 0.55 }}>
              {BARS.map((w) => (
                <View
                  key={w}
                  style={{ width: w, height: 12, borderRadius: 6, backgroundColor: colors.ink }}
                />
              ))}
            </View>
            <Text variant="note" tone="muted">
              {lockedLabel}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

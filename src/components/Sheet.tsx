import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { bezierOf } from './motion';
import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/** Hoja inferior de radio 28 sobre el velo, con agarradera (DISENO §7). */
export function Sheet({ visible, onClose, title, children }: Props) {
  const { colors, spacing, radius, shadows, motion } = useTheme();
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(height);
  const veil = useSharedValue(0);

  // Montar en el mismo render en que se pide abrir (patrón de estado derivado).
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      veil.value = withTiming(1, { duration: reduced ? motion.reduced : motion.base.duration });
      y.value = reduced
        ? withTiming(0, { duration: motion.reduced })
        : withSpring(0, { ...motion.spring, damping: 20 });
    } else if (mounted) {
      veil.value = withTiming(0, { duration: reduced ? motion.reduced : motion.exit.duration });
      y.value = withTiming(
        height,
        {
          duration: reduced ? motion.reduced : motion.exit.duration,
          easing: bezierOf(motion.exit),
        },
        (done) => {
          if (done) runOnJS(setMounted)(false);
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }, veilStyle]}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: colors.scrim }}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          />
        </Animated.View>
        <Animated.View
          style={[
            {
              maxHeight: height * 0.9,
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.sm,
              paddingBottom: spacing.xl + insets.bottom,
              boxShadow: shadows.float,
            },
            sheetStyle,
          ]}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.surface2,
              marginBottom: spacing.md,
            }}
          />
          {title ? (
            <Text variant="h2" accessibilityRole="header" style={{ marginBottom: spacing.md }}>
              {title}
            </Text>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

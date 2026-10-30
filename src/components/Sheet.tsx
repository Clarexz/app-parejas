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
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

const TEAR = 10;

/** Borde superior "arrancado": zigzag irregular determinista. */
function tornPath(width: number): string {
  const step = 14;
  let d = `M0 ${TEAR}`;
  for (let x = 0, i = 0; x < width; x += step, i++) {
    const y = i % 2 === 0 ? 2 + (i % 3) : TEAR - (i % 4);
    d += ` L${Math.min(x + step / 2, width)} ${y}`;
  }
  return `${d} L${width} ${TEAR} L${width} ${TEAR + 1} L0 ${TEAR + 1} Z`;
}

/** Hoja que sube desde abajo sobre un velo (DISENO §7). */
export function Sheet({ visible, onClose, title, children }: Props) {
  const { colors, spacing, shadows, motion } = useTheme();
  const reduced = useReducedMotion();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(height);
  const veil = useSharedValue(0);

  // Montar en el mismo render en que se pide abrir (patrón de estado derivado).
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      veil.value = withTiming(1, { duration: motion.duration.base });
      y.value = reduced
        ? withTiming(0, { duration: motion.duration.fast })
        : withSpring(0, motion.springSoft);
    } else if (mounted) {
      veil.value = withTiming(0, { duration: motion.duration.fast });
      y.value = withTiming(height, { duration: motion.duration.base }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
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
        <Animated.View style={[{ maxHeight: height * 0.9 }, sheetStyle]}>
          <Svg width={width} height={TEAR + 1} style={{ marginBottom: -1 }}>
            <Path d={tornPath(width)} fill={colors.paperRaised} />
          </Svg>
          <View
            style={{
              backgroundColor: colors.paperRaised,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.sm,
              paddingBottom: spacing.xl + insets.bottom,
              boxShadow: shadows.lifted,
            }}
          >
            {title ? (
              <Text variant="title" accessibilityRole="header" style={{ marginBottom: spacing.md }}>
                {title}
              </Text>
            ) : null}
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

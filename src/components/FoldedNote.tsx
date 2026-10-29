import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

type Props = {
  open: boolean;
  /** Contenido real: solo se monta cuando `open` es true (privacidad). */
  children: ReactNode;
  lockedLabel?: string;
  onPress?: () => void;
};

const SCRIBBLE_WIDTHS = ['92%', '78%', '86%', '54%'] as const;
const FOLD = 28;

/** Respuesta doblada: ilegible hasta que se abre (DISENO §7). */
export function FoldedNote({
  open,
  children,
  lockedLabel = 'Doblada hasta que contestes',
  onPress,
}: Props) {
  const { colors, spacing, radius, shadows, motion } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(open ? 1 : 0);
  const wasOpen = useRef(open);

  useEffect(() => {
    if (open === wasOpen.current) return;
    wasOpen.current = open;
    if (open) haptic.success();
    progress.value = withTiming(open ? 1 : 0, {
      duration: reduced ? motion.duration.fast : motion.duration.slow,
      easing: Easing.out(Easing.cubic),
    });
  }, [open, reduced, motion, progress]);

  const unfold = useAnimatedStyle(() => ({
    transform: reduced ? [] : [{ scaleY: 0.6 + 0.4 * progress.value }],
  }));
  const fade = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={open ? undefined : lockedLabel}
      style={{ alignSelf: 'stretch' }}
    >
      <Animated.View
        style={[
          {
            backgroundColor: colors.paperRaised,
            borderRadius: radius.none,
            borderTopWidth: 2,
            borderTopColor: colors.margin,
            padding: spacing.lg,
            minHeight: 96,
            boxShadow: shadows.object,
          },
          unfold,
        ]}
      >
        {open ? (
          <Animated.View style={fade}>{children}</Animated.View>
        ) : (
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View
              style={{
                gap: spacing.sm,
                paddingRight: FOLD,
                minHeight: 64,
                justifyContent: 'center',
              }}
            >
              {SCRIBBLE_WIDTHS.map((w) => (
                <View
                  key={w}
                  style={{ width: w, height: 3, backgroundColor: colors.ruled, borderRadius: 2 }}
                />
              ))}
            </View>
          </View>
        )}
        {!open ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: spacing.lg,
              right: spacing.lg,
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                backgroundColor: colors.paperRaised,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              }}
            >
              <Icon name="lock" size={20} color={colors.jamaica} />
              <Text variant="hand" tone="jamaica" style={{ flexShrink: 1 }}>
                {lockedLabel}
              </Text>
            </View>
          </View>
        ) : null}
        {!open ? (
          <Svg
            width={FOLD}
            height={FOLD}
            pointerEvents="none"
            style={{ position: 'absolute', top: -2, right: 0 }}
          >
            {/* Esquina doblada: lo que queda de la hoja y el triángulo del dobléz. */}
            <Path d={`M0 0 L${FOLD} 0 L${FOLD} ${FOLD} Z`} fill={colors.paper} />
            <Path d={`M0 0 L${FOLD} ${FOLD} L0 ${FOLD} Z`} fill={colors.ruled} />
            <Path d={`M0 0 L${FOLD} ${FOLD}`} stroke={colors.inkFaint} strokeWidth={1} />
          </Svg>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

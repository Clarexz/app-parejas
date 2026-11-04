import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Icon, Text } from '@/components';
import { useTheme } from '@/theme';

/** Racha en una píldora: chispa en tu fruta + número + "días". La chispa se enciende (§5). */
export function StreakChip({ days }: { days: number }) {
  const { colors, spacing, radius, motion, fruit } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      progress.value = withTiming(1, { duration: motion.reduced });
      return;
    }
    progress.value = withTiming(1, { duration: motion.base.duration });
  }, [reduced, progress, motion]);
  const spark = useAnimatedStyle(() => ({
    opacity: reduced ? progress.value : 1,
    transform: reduced
      ? []
      : [{ scale: 0.4 + 0.6 * progress.value }, { rotate: `${-12 * (1 - progress.value)}deg` }],
  }));
  return (
    <View
      accessible
      accessibilityLabel={`Racha de ${days} ${days === 1 ? 'día' : 'días'}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        backgroundColor: colors.surface2,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
      }}
    >
      <Animated.View style={spark}>
        <Icon name="spark" size={18} color={fruit.me.hex} />
      </Animated.View>
      <Text variant="num" style={{ fontSize: 16, lineHeight: 20 }}>
        {days}
      </Text>
      <Text variant="ui" style={{ fontSize: 14, lineHeight: 20 }}>
        {days === 1 ? 'día' : 'días'}
      </Text>
    </View>
  );
}

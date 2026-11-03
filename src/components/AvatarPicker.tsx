import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { Avatar } from './Avatar';
import { IconButton } from './IconButton';
import { BrandSymbol } from './Symbol';
import { Text } from './Text';

type Props = {
  name: string;
  uri?: string | null;
  onPick: () => void;
  /** Subiendo la foto: el círculo respira y el botón se deshabilita. */
  loading?: boolean;
  variant?: 'person' | 'couple';
};

const SIZE = 144;

/** Círculo grande para elegir la foto de perfil o de la pareja (DISENO §7). */
export function AvatarPicker({ name, uri, onPick, loading = false, variant = 'person' }: Props) {
  const { spacing, radius, colors, fruit } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (loading && !reduced) {
      pulse.value = withRepeat(
        withSequence(withTiming(0.4, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
      );
    } else {
      pulse.value = 1;
    }
  }, [loading, reduced, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const couple = variant === 'couple';
  const hasPhoto = !!uri;
  const label = hasPhoto ? 'Cambiar foto' : 'Elegir foto';

  return (
    <View style={{ alignSelf: 'flex-start', gap: spacing.sm }}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} de ${name || (couple ? 'ustedes' : 'perfil')}`}
          accessibilityState={{ disabled: loading }}
          disabled={loading}
          onPress={onPick}
        >
          <Animated.View style={pulseStyle}>
            {hasPhoto || (!couple && name.trim()) ? (
              <Avatar name={name} source={uri ?? undefined} size={SIZE} fruit={fruit.me} ring />
            ) : (
              <View
                style={{
                  width: SIZE,
                  height: SIZE,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BrandSymbol size={64} />
              </View>
            )}
          </Animated.View>
        </Pressable>
        <View style={{ position: 'absolute', right: -spacing.xs, bottom: -spacing.xs }}>
          <IconButton
            name="camera"
            variant="filled"
            accessibilityLabel={label}
            disabled={loading}
            onPress={onPick}
          />
        </View>
      </View>
      {name ? (
        <Text variant="ui" tone="muted">
          {name}
        </Text>
      ) : null}
    </View>
  );
}

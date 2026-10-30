import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { initialOf, paletteIndex } from './Avatar';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { Polaroid } from './Polaroid';
import { Text } from './Text';

type Props = {
  name: string;
  uri?: string | null;
  onPick: () => void;
  /** Subiendo la foto: la polaroid se "revela" y el botón se deshabilita. */
  loading?: boolean;
  variant?: 'person' | 'couple';
};

const SIZE = 'L';
const INNER = 220 - 12;

/** Polaroid grande para elegir la foto de perfil o de la pareja (DISENO §7). */
export function AvatarPicker({ name, uri, onPick, loading = false, variant = 'person' }: Props) {
  const { colors, spacing, radius } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (loading && !reduced) {
      pulse.value = withRepeat(
        withSequence(withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
      );
    } else {
      pulse.value = 1;
    }
  }, [loading, reduced, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const idx = paletteIndex(name);
  const bg = [colors.jamaica, colors.cempasuchil, colors.nopal][idx];
  const fg = [colors.onJamaica, colors.onPolaroid, colors.onPolaroid][idx];
  const couple = variant === 'couple';
  const hasPhoto = !!uri;
  const label = hasPhoto ? 'Cambiar foto' : 'Elegir foto';

  return (
    <View style={{ alignSelf: 'flex-start' }}>
      <Polaroid
        size={SIZE}
        id={`avatar-${variant}`}
        tape={couple ? 'pink' : 'yellow'}
        caption={name || undefined}
        source={uri ?? undefined}
        onPress={loading ? undefined : onPick}
        accessibilityLabel={`${label} de ${name || (couple ? 'ustedes' : 'perfil')}`}
      >
        {hasPhoto ? null : (
          <View
            style={{
              width: INNER,
              height: INNER,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: couple ? colors.photoEmpty : bg,
            }}
          >
            {couple ? (
              <Icon name="photo" size={28} color={colors.inkFaint} />
            ) : (
              <Text
                variant="hero"
                style={{ color: fg, fontSize: INNER * 0.5, lineHeight: INNER * 0.6 }}
              >
                {initialOf(name)}
              </Text>
            )}
          </View>
        )}
        {loading ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                width: INNER,
                height: INNER,
                backgroundColor: colors.photoEmpty,
                borderRadius: radius.none,
              },
              pulseStyle,
            ]}
          />
        ) : null}
      </Polaroid>
      <View style={{ position: 'absolute', right: -spacing.sm, bottom: spacing.xxl }}>
        <IconButton
          name="camera"
          variant="sticker"
          accessibilityLabel={label}
          disabled={loading}
          onPress={onPick}
        />
      </View>
    </View>
  );
}

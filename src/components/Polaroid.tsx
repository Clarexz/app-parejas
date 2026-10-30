import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { useStickIn } from './motion';
import { Stamp } from './Stamp';
import { Tape, type TapeColor } from './Tape';
import { Text } from './Text';

export type PolaroidSize = 'S' | 'M' | 'L';

const WIDTHS: Record<PolaroidSize, number> = { S: 104, M: 150, L: 220 };

type Props = {
  source?: ImageSourcePropType | string | { uri: string };
  /** Para ilustraciones u otro contenido en lugar de foto. */
  children?: ReactNode;
  caption?: string;
  /** Fecha ya formateada; se pega como sello al borde. */
  date?: string;
  tape?: TapeColor | false;
  size?: PolaroidSize;
  /** Semilla para el tilt determinista (±3°). */
  id?: string;
  tilt?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/** Foto con marco, pie a mano, sello de fecha y cinta (DISENO §7). */
export function Polaroid({
  source,
  children,
  caption,
  date,
  tape = false,
  size = 'M',
  id,
  tilt,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: Props) {
  const { colors, spacing, radius, shadows, motion } = useTheme();
  const reduced = useReducedMotion();
  const width = WIDTHS[size];
  const angle = tilt ?? (id ? tiltFor(id, 3) : 0);
  const stick = useStickIn(angle);
  // El resultado de carga se ata a la fuente: si cambia, vuelve a "revelándose".
  const [result, setResult] = useState<{ source: unknown; state: 'ready' | 'error' } | null>(null);
  const state: 'loading' | 'ready' | 'error' = !source
    ? 'ready'
    : result?.source === source
      ? result.state
      : 'loading';
  const pulse = useSharedValue(1);

  const loading = state === 'loading';
  useEffect(() => {
    if (loading && !reduced) {
      pulse.value = withRepeat(
        withSequence(withTiming(0.55, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
      );
    } else {
      pulse.value = 1;
    }
  }, [loading, reduced, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const inner = width - 12;
  const photo = (
    <View
      style={{
        width: inner,
        height: inner,
        backgroundColor: colors.photoEmpty,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {children}
      {source && state !== 'error' ? (
        <Image
          source={source as never}
          style={{ position: 'absolute', width: inner, height: inner }}
          contentFit="cover"
          transition={motion.duration.slow}
          onLoad={() => setResult({ source, state: 'ready' })}
          onError={() => setResult({ source, state: 'error' })}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      {loading ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: inner,
              height: inner,
              backgroundColor: colors.photoEmpty,
            },
            pulseStyle,
          ]}
        />
      ) : null}
      {state === 'error' ? (
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Icon name="photo" size={size === 'S' ? 24 : 28} color={colors.inkFaint} />
          <Text variant="caption" tone="faint">
            No cargó
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <Animated.View style={[{ alignSelf: 'flex-start' }, stick, style]}>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityLabel={accessibilityLabel ?? caption}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => ({
          width,
          backgroundColor: colors.polaroid,
          borderRadius: radius.none,
          padding: 6,
          paddingBottom: 24,
          boxShadow: pressed ? shadows.lifted : shadows.object,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        {photo}
        {caption ? (
          <Text
            variant="handSmall"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              color: colors.onPolaroid,
              position: 'absolute',
              left: 8,
              right: 8,
              bottom: 4,
            }}
          >
            {caption}
          </Text>
        ) : null}
      </Pressable>
      {date ? (
        <Stamp
          style={{
            position: 'absolute',
            right: -6,
            bottom: 22,
            backgroundColor: colors.polaroid,
          }}
        >
          {date}
        </Stamp>
      ) : null}
      {tape ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: -8, left: 0, right: 0, alignItems: 'center' }}
        >
          <Tape color={tape} width={48} height={16} rotate={-4} />
        </View>
      ) : null}
    </Animated.View>
  );
}

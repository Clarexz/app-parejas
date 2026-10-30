import { Image } from 'expo-image';
import { useState } from 'react';
import { View, type ImageSourcePropType } from 'react-native';

import { useTheme } from '@/theme';

import { Sticker } from './Sticker';
import { Text } from './Text';

type Props = {
  variant?: 'polaroid' | 'round';
  name: string;
  source?: ImageSourcePropType | string | { uri: string };
  size?: number;
  /** Mood corto (emoji o frase); se pega como sticker en la esquina. */
  mood?: string;
};

/** Inicial en mayúscula del nombre (primera letra visible). */
export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toLocaleUpperCase('es-MX') : '?';
}

/** Índice determinista 0..2 por nombre para elegir color de la paleta. */
export function paletteIndex(name: string): number {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 3;
}

/** Mini polaroid o círculo con foto, o inicial a mano si no hay foto (DISENO §7). */
export function Avatar({ variant = 'round', name, source, size = 56, mood }: Props) {
  const { colors, radius, shadows, spacing } = useTheme();
  const [failed, setFailed] = useState(false);
  const bg = [colors.jamaica, colors.cempasuchil, colors.nopal][paletteIndex(name)];
  const fg = [colors.onJamaica, colors.onPolaroid, colors.onPolaroid][paletteIndex(name)];
  const hasPhoto = !!source && !failed;
  const frame = variant === 'polaroid' ? 4 : 0;
  const inner = size - frame * 2;

  const face = (
    <View
      style={{
        width: inner,
        height: inner,
        backgroundColor: bg,
        borderRadius: variant === 'round' ? radius.pill : radius.none,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {hasPhoto ? (
        <Image
          source={source as never}
          style={{ width: inner, height: inner }}
          contentFit="cover"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          variant="hand"
          style={{
            color: fg,
            fontSize: Math.round(inner * 0.5),
            lineHeight: Math.round(inner * 0.6),
          }}
        >
          {initialOf(name)}
        </Text>
      )}
    </View>
  );

  return (
    <View accessible accessibilityLabel={mood ? `${name}, ${mood}` : name} style={{ width: size }}>
      {variant === 'polaroid' ? (
        <View
          style={{
            width: size,
            padding: frame,
            paddingBottom: frame * 3,
            backgroundColor: colors.polaroid,
            boxShadow: shadows.object,
            transform: [{ rotate: '-2deg' }],
          }}
        >
          {face}
        </View>
      ) : (
        face
      )}
      {mood ? (
        <View style={{ position: 'absolute', right: -Math.round(size * 0.3), bottom: -spacing.sm }}>
          <Sticker label={mood} tilt={4} />
        </View>
      ) : null}
    </View>
  );
}

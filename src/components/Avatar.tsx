import { Image } from 'expo-image';
import { useState } from 'react';
import { View, type ImageSourcePropType } from 'react-native';

import { imageCacheKey, remoteImageSource } from '@/lib/imageCache';
import { useTheme } from '@/theme';

import { fruitHex, type FruitLike } from './Symbol';
import { Text } from './Text';

type Props = {
  name: string;
  source?: ImageSourcePropType | string | { uri: string };
  /** Tamaño total (con aro, si lo lleva): 64 en Inicio, 40 en listas, 28 en comentarios. */
  size?: number;
  /** Fruta de la persona: color del aro. */
  fruit?: FruitLike;
  /** Dibuja el aro de 3 dp con separación `bg` (el aro con punto es "story nueva"). */
  ring?: boolean;
  /** Punto de story nueva. */
  newDot?: boolean;
  /** Mood corto (emoji); se pone en una burbuja chica en la esquina. */
  mood?: string;
};

/** Inicial en mayúscula del nombre (primera letra visible). */
export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toLocaleUpperCase('es-MX') : '?';
}

/** Fotos remotas con llave de caché estable (la URL firmada cambia de token). */
function resolveSource(source: Props['source']) {
  if (typeof source === 'string') return remoteImageSource(source);
  if (source && typeof source === 'object' && 'uri' in source && typeof source.uri === 'string') {
    return remoteImageSource(source.uri);
  }
  return source;
}

const RING = 3;
const GAP = 3;

/** Foto o inicial sobre `surface2`, con aro de la fruta de su dueño (DISENO §7). */
export function Avatar({
  name,
  source,
  size = 56,
  fruit,
  ring = false,
  newDot = false,
  mood,
}: Props) {
  const { colors, radius } = useTheme();
  const [failed, setFailed] = useState(false);
  const hasPhoto = !!source && !failed;
  const color = fruitHex(fruit ?? 'sandia');
  const inset = ring ? RING + GAP : 0;
  const inner = size - inset * 2;
  const dot = Math.max(12, Math.round(size / 4));

  return (
    <View
      accessible
      accessibilityLabel={mood ? `${name}, ${mood}` : name}
      style={{ width: size, height: size }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius.pill,
          borderWidth: ring ? RING : 0,
          borderColor: color,
          padding: ring ? GAP : 0,
        }}
      >
        <View
          style={{
            width: inner - (ring ? 0 : 0),
            height: inner,
            borderRadius: radius.pill,
            backgroundColor: colors.surface2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {hasPhoto ? (
            <Image
              source={resolveSource(source) as never}
              cachePolicy="memory-disk"
              recyclingKey={typeof source === 'string' ? imageCacheKey(source) : undefined}
              style={{ width: inner, height: inner }}
              contentFit="cover"
              onError={() => setFailed(true)}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text
              variant="h3"
              style={{
                fontSize: Math.round(inner * 0.42),
                lineHeight: Math.round(inner * 0.5),
              }}
            >
              {initialOf(name)}
            </Text>
          )}
        </View>
      </View>
      {newDot ? (
        <View
          style={{
            position: 'absolute',
            right: -RING,
            top: -RING,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: color,
            borderWidth: 3,
            borderColor: colors.bg,
          }}
        />
      ) : null}
      {mood ? (
        <View
          style={{
            position: 'absolute',
            right: -4,
            bottom: -4,
            minWidth: 24,
            height: 24,
            borderRadius: 12,
            paddingHorizontal: 4,
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="note" style={{ lineHeight: 18 }}>
            {mood}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

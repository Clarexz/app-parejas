import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Tape } from '@/components';
import { useTheme } from '@/theme';

import type { MemoryPhoto } from '../api';

const MIN_ASPECT = 0.75;
const MAX_ASPECT = 1.4;
const FRAME_PAD = 8;
const FRAME_FOOT = 28;
/** Aire a cada lado del marco para que su sombra no se corte. */
const SIDE = 16;

/** Proporción ancho/alto de la foto, acotada para que el marco no se descomponga. */
export function photoAspect(photo: Pick<MemoryPhoto, 'width' | 'height'>): number {
  if (!photo.width || !photo.height) return 1;
  return Math.min(Math.max(photo.width / photo.height, MIN_ASPECT), MAX_ASPECT);
}

type FrameProps = {
  url?: string;
  thumbUrl?: string;
  width: number;
  aspect: number;
  label: string;
};

/** Foto grande en marco polaroid con cinta (la `Polaroid` solo llega a 220 dp y es cuadrada). */
export function PhotoFrame({ url, thumbUrl, width, aspect, label }: FrameProps) {
  const { colors, radius, shadows, motion } = useTheme();
  const inner = width - FRAME_PAD * 2;
  return (
    <View style={{ width }}>
      <View
        style={{
          width,
          padding: FRAME_PAD,
          paddingBottom: FRAME_FOOT,
          backgroundColor: colors.polaroid,
          borderRadius: radius.none,
          boxShadow: shadows.object,
        }}
      >
        <View style={{ width: inner, height: inner / aspect, backgroundColor: colors.photoEmpty }}>
          {url ? (
            <Image
              source={{ uri: url }}
              placeholder={thumbUrl ? { uri: thumbUrl } : undefined}
              style={{ width: inner, height: inner / aspect }}
              contentFit="cover"
              transition={motion.duration.slow}
              accessibilityLabel={label}
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>
      </View>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: -8, left: 0, right: 0, alignItems: 'center' }}
      >
        <Tape color="yellow" width={52} height={18} rotate={-3} />
      </View>
    </View>
  );
}

type Props = {
  photos: MemoryPhoto[];
  urls: Record<string, string>;
  /** Ancho disponible del carrusel en dp. */
  width: number;
  title: string;
  onIndexChange?: (index: number) => void;
};

/** Carrusel paginado de fotos grandes, con puntitos de página. */
export function PhotoCarousel({ photos, urls, width, title, onIndexChange }: Props) {
  const { colors, spacing, radius } = useTheme();
  const [index, setIndex] = useState(0);
  const last = useRef(0);
  const frameWidth = width - SIDE * 2;
  const tallest = Math.max(...photos.map((p) => (frameWidth - FRAME_PAD * 2) / photoAspect(p)));
  const height = tallest + FRAME_PAD + FRAME_FOOT + 16;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(
      Math.max(Math.round(e.nativeEvent.contentOffset.x / width), 0),
      photos.length - 1,
    );
    if (next !== last.current) {
      last.current = next;
      setIndex(next);
      onIndexChange?.(next);
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.path}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        initialNumToRender={2}
        windowSize={3}
        style={{ width, height }}
        renderItem={({ item, index: i }) => (
          <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
            <PhotoFrame
              url={urls[item.path]}
              thumbUrl={urls[item.thumb_path]}
              width={frameWidth}
              aspect={photoAspect(item)}
              label={`Foto ${i + 1} de ${photos.length} de ${title}`}
            />
          </View>
        )}
      />
      {photos.length > 1 ? (
        <View
          accessibilityRole="adjustable"
          accessibilityLabel={`Foto ${index + 1} de ${photos.length}`}
          style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}
        >
          {photos.map((p, i) => (
            <View
              key={p.path}
              style={{
                width: i === index ? 18 : 8,
                height: 8,
                borderRadius: radius.pill,
                backgroundColor: i === index ? colors.jamaica : colors.inkFaint,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

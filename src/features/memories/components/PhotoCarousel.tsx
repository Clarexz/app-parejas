import { useRef, useState } from 'react';
import { FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { useTheme } from '@/theme';

import type { MemoryPhoto } from '../api';
import { MemoryPhotoTile } from './MemoryPhotoTile';

const MIN_ASPECT = 0.75;
const MAX_ASPECT = 1.4;
/** Espacio entre foto y foto al deslizar. */
const GAP = 12;

/** Proporción ancho/alto de la foto, acotada para que el carrusel no se descomponga. */
export function photoAspect(photo: Pick<MemoryPhoto, 'width' | 'height'>): number {
  if (!photo.width || !photo.height) return 1;
  return Math.min(Math.max(photo.width / photo.height, MIN_ASPECT), MAX_ASPECT);
}

type Props = {
  photos: MemoryPhoto[];
  urls: Record<string, string>;
  /** Ancho disponible del carrusel en dp. */
  width: number;
  title: string;
  onIndexChange?: (index: number) => void;
};

/** Carrusel paginado de fotos con radio 24; los puntitos son de tu fruta (DISENO §8). */
export function PhotoCarousel({ photos, urls, width, title, onIndexChange }: Props) {
  const { colors, spacing, radius, fruit } = useTheme();
  const [index, setIndex] = useState(0);
  const last = useRef(0);
  const page = width + GAP;
  const tallest = Math.max(...photos.map((p) => width / photoAspect(p)));

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(
      Math.max(Math.round(e.nativeEvent.contentOffset.x / page), 0),
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
        snapToInterval={page}
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.path}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: page, offset: page * i, index: i })}
        initialNumToRender={2}
        windowSize={3}
        style={{ width, height: tallest, flexGrow: 0 }}
        renderItem={({ item, index: i }) => (
          <View
            style={{
              width,
              height: tallest,
              marginRight: i === photos.length - 1 ? 0 : GAP,
              justifyContent: 'center',
            }}
          >
            <MemoryPhotoTile
              url={urls[item.path]}
              placeholderUrl={urls[item.thumb_path]}
              aspectRatio={photoAspect(item)}
              width={width}
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
                backgroundColor: i === index ? fruit.me.hex : colors.surface2,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { CANVAS_H, CANVAS_W } from '@/lib/drawing';
import { imageCacheKey, remoteImageSource } from '@/lib/imageCache';
import type { Fruit } from '@/lib/fruits';
import { useTheme } from '@/theme';

import type { Story } from '../api';
import { useStoryMediaUrl } from '../hooks';
import { StoryFrame } from './StoryFrame';

type Props = {
  story: Story;
  /** Ancho en dp; el alto es 16/9 de eso. */
  width: number;
  /** Fruta de quien la publicó (color de sus stickers). */
  fruit?: Fruit;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** Miniatura 9:16 de una story: la foto usa su miniatura; texto y dibujo se dibujan con `StoryFrame`. */
export function StoryThumb({
  story,
  width,
  fruit,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const { colors, radius } = useTheme();
  const height = (width * CANVAS_H) / CANVAS_W;
  const { url } = useStoryMediaUrl(story.kind === 'photo' ? story.thumb_path : null);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({ width, opacity: pressed ? 0.8 : 1 })}
    >
      {story.kind === 'photo' ? (
        <View
          style={{
            width,
            height,
            borderRadius: radius.md,
            overflow: 'hidden',
            backgroundColor: colors.surface2,
          }}
        >
          {url ? (
            <Image
              source={remoteImageSource(url)}
              cachePolicy="memory-disk"
              recyclingKey={imageCacheKey(url)}
              style={{ width, height }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>
      ) : (
        <View
          style={{
            borderRadius: radius.md,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.line,
          }}
          pointerEvents="none"
        >
          <StoryFrame story={story} width={width - 2} fruit={fruit} />
        </View>
      )}
    </Pressable>
  );
}

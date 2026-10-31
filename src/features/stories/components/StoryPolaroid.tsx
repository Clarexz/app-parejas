import { View } from 'react-native';

import { Polaroid, type TapeColor } from '@/components';
import type { PolaroidSize } from '@/components/Polaroid';
import { CANVAS_H, CANVAS_W } from '@/lib/drawing';

import type { Story } from '../api';
import { useStoryMediaUrl } from '../hooks';
import { StoryFrame } from './StoryFrame';

// Mismos anchos que `Polaroid` (su área de foto es cuadrada: ancho − 12).
const WIDTHS: Record<PolaroidSize, number> = { S: 104, M: 150, L: 220 };

type Props = {
  story: Story;
  size?: PolaroidSize;
  caption?: string;
  date?: string;
  tape?: TapeColor | false;
  tilt?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/**
 * Miniatura de una story como polaroid: la foto usa su miniatura; texto y dibujo se dibujan con
 * `StoryFrame` recortado al centro del cuadro.
 */
export function StoryPolaroid({
  story,
  size = 'M',
  caption,
  date,
  tape = false,
  tilt,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const inner = WIDTHS[size] - 12;
  const { url } = useStoryMediaUrl(story.kind === 'photo' ? story.thumb_path : null);
  const frameHeight = (inner * CANVAS_H) / CANVAS_W;

  return (
    <Polaroid
      id={story.id}
      size={size}
      caption={caption}
      date={date}
      tape={tape}
      tilt={tilt}
      source={story.kind === 'photo' ? (url ?? undefined) : undefined}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {story.kind === 'photo' ? null : (
        <View
          style={{
            width: inner,
            height: inner,
            overflow: 'hidden',
          }}
        >
          <View style={{ marginTop: -(frameHeight - inner) / 2 }}>
            <StoryFrame story={story} width={inner} />
          </View>
        </View>
      )}
    </Polaroid>
  );
}

import { View } from 'react-native';

import { Polaroid, Text } from '@/components';
import { initialOf } from '@/components/Avatar';
import type { Mood } from '@/features/mood';
import { useSignedUrl, type Profile } from '@/features/profile';
import { moodLabel } from '@/lib/mood';
import { useTheme } from '@/theme';

import { MoodSticker } from './MoodSticker';

type Props = {
  profile: Profile | null;
  fallback: string;
  tape: 'yellow' | 'mint';
  mood: Mood | null;
  /** Mientras llegan los moods no se muestra ni sticker ni aviso. */
  moodsLoading?: boolean;
  /** Solo en mi polaroid: abre el selector de mood. */
  onPress?: () => void;
  pulse?: number;
};

const WIDTH = 150;

/** Polaroid de una persona con su mood en sticker y su nota a mano debajo (DISENO §8). */
export function PersonPolaroid({
  profile,
  fallback,
  tape,
  mood,
  moodsLoading = false,
  onPress,
  pulse,
}: Props) {
  const { colors, spacing } = useTheme();
  const url = useSignedUrl(profile?.avatar_path);
  const label = profile?.nickname || profile?.display_name || fallback;
  const mine = !!onPress;
  const spoken = mood ? (moodLabel(mood.emoji) ?? mood.emoji) : null;
  const a11y = spoken ? `${label}, ${spoken}${mood?.note ? `: ${mood.note}` : ''}` : label;

  return (
    <View style={{ width: WIDTH, gap: spacing.sm }}>
      <View>
        <Polaroid
          id={profile?.id ?? fallback}
          size="M"
          tape={tape}
          caption={label}
          source={url ?? undefined}
          onPress={onPress}
          accessibilityLabel={a11y}
          accessibilityHint={mine ? 'Toca para cambiar tu mood' : undefined}
        >
          <Text variant="hero" style={{ color: colors.inkMuted }}>
            {initialOf(label)}
          </Text>
        </Polaroid>
        {!moodsLoading ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: -spacing.md, right: mood ? -spacing.md : 0 }}
          >
            {mood ? (
              <MoodSticker emoji={mood.emoji} pulse={pulse} />
            ) : mine ? (
              <MoodSticker label="¿cómo estás?" />
            ) : null}
          </View>
        ) : null}
      </View>
      {!moodsLoading && mood?.note ? (
        <Text variant="hand" numberOfLines={2} style={{ paddingHorizontal: spacing.xs }}>
          {mood.note}
        </Text>
      ) : null}
      {!moodsLoading && !mood && !mine ? (
        <Text variant="small" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          Sin mood todavía
        </Text>
      ) : null}
    </View>
  );
}

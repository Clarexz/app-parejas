import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, MoodBubble, type FruitLike } from '@/components';
import type { Mood } from '@/features/mood';
import { useSignedUrl, type Profile } from '@/features/profile';
import { moodLabel } from '@/lib/mood';
import { storyAgo } from '@/lib/stories';
import { useTheme } from '@/theme';

type Props = {
  profile: Profile | null;
  /** Nombre si el perfil aún no carga. */
  fallback: string;
  fruit: FruitLike;
  mood: Mood | null;
  /** Mientras llegan los moods la burbuja muestra el símbolo respirando. */
  moodsLoading?: boolean;
  /** Hay story nueva de esta persona (punto en el aro). */
  newStory?: boolean;
  /** Tocar la foto (abre el visor o "crear"); sin él, la foto no hace nada. */
  onPressAvatar?: () => void;
  /** Solo en la tuya: abre el selector de mood. */
  onPressMood?: () => void;
  pulse?: number;
  now?: Date;
};

function AvatarButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1 })}
    >
      {children}
    </Pressable>
  );
}

/** Una persona de Inicio: foto con el aro de su fruta y su burbuja de mood debajo (DISENO §8). */
export function PersonColumn({
  profile,
  fallback,
  fruit,
  mood,
  moodsLoading = false,
  newStory = false,
  onPressAvatar,
  onPressMood,
  pulse = 0,
  now = new Date(),
}: Props) {
  const { spacing } = useTheme();
  const url = useSignedUrl(profile?.avatar_path);
  const name = profile?.nickname || profile?.display_name || fallback;
  const mine = !!onPressMood;

  const avatar = (
    <Avatar name={name} source={url ?? undefined} size={64} fruit={fruit} ring newDot={newStory} />
  );

  let bubble: ReactNode;
  if (mood) {
    const spoken = moodLabel(mood.emoji) ?? '';
    const note = [`${mine ? 'Tú' : name} · ${storyAgo(mood.created_at, now)}`, mood.note]
      .filter(Boolean)
      .join('\n');
    bubble = (
      <MoodBubble
        fruit={fruit}
        emoji={mood.emoji}
        mood={spoken}
        note={note}
        pulse={mine ? 0 : pulse}
        onPress={onPressMood}
        accessibilityLabel={`${name}, ${spoken || mood.emoji}${mood.note ? `: ${mood.note}` : ''}`}
      />
    );
  } else if (mine) {
    bubble = (
      <MoodBubble
        fruit={fruit}
        empty
        loading={moodsLoading}
        onPress={onPressMood}
        accessibilityLabel="¿Y tú? Toca para elegir tu mood"
      />
    );
  } else {
    bubble = (
      <MoodBubble
        fruit={fruit}
        empty
        loading={moodsLoading}
        emptyTitle="Sin mood"
        emptyNote={`${name} aún no elige`}
      />
    );
  }

  const label = newStory ? `Story nueva de ${name}` : mine ? 'Sube una story' : `Story de ${name}`;

  return (
    <View style={{ flex: 1, gap: spacing.md }}>
      {onPressAvatar ? (
        <AvatarButton onPress={onPressAvatar} label={label}>
          {avatar}
        </AvatarButton>
      ) : (
        avatar
      )}
      {bubble}
    </View>
  );
}

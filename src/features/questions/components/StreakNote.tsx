import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon, Note, Text } from '@/components';
import { repairLine, streakLine, streakView } from '@/lib/questionCopy';
import { useTheme } from '@/theme';

import { useStreak } from '../hooks';

/** Racha de ustedes en un post-it: escrita a mano, con la flama que se dibuja (DISENO §8). */
export function StreakNote() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { streak, isLoading, isError } = useStreak();

  if (!streak || isLoading || isError) return null;
  const view = streakView(streak);

  return (
    <Note id="racha" tape={false} style={{ marginLeft: spacing.lg, maxWidth: '88%' }}>
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {view.kind === 'streak' ? (
            <Icon name="flame" size={28} color={colors.cempasuchil} draw />
          ) : null}
          <Text variant="hand" style={{ color: colors.onPostit, flexShrink: 1 }}>
            {streakLine(view.kind === 'streak' ? view.current : 0)}
          </Text>
        </View>
        {view.missing > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${repairLine(view.missing)}. Abre las preguntas.`}
            onPress={() => router.navigate('/questions')}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text
              variant="small"
              style={{
                color: colors.onPostit,
                textDecorationLine: 'underline',
                textDecorationColor: colors.onPostit,
              }}
            >
              {repairLine(view.missing)}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Note>
  );
}

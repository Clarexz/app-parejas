import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Text } from '@/components';
import { repairLine, streakView } from '@/lib/questionCopy';
import { useTheme } from '@/theme';

import { useStreak } from '../hooks';
import { StreakChip } from './StreakChip';

/** Racha de ustedes: chip con la chispa y, si hay días por reparar, el aviso (DISENO §8). */
export function StreakNote() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { streak, isLoading, isError } = useStreak();

  if (!streak || isLoading || isError) return null;
  const view = streakView(streak);

  return (
    <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
      {view.kind === 'streak' ? (
        <StreakChip days={view.current} />
      ) : (
        <Text variant="body" tone="muted">
          Todavía no hay racha. Contesten hoy y empieza.
        </Text>
      )}
      {view.missing > 0 ? (
        <Button
          title={repairLine(view.missing)}
          variant="ghost"
          size="sm"
          onPress={() => router.navigate('/questions')}
        />
      ) : null}
    </View>
  );
}

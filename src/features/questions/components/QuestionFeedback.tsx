import { View } from 'react-native';

import { Chip, Text } from '@/components';
import { useToast } from '@/components/Toast';
import { errorMessage } from '@/lib/errors';
import { nextFeedbackVote } from '@/lib/feedback';
import { haptic } from '@/lib/haptics';
import {
  FEEDBACK_DOWN_LABEL,
  FEEDBACK_DOWN_NOTE,
  FEEDBACK_TITLE,
  FEEDBACK_UP_LABEL,
} from '@/lib/questionCopy';
import { useTheme } from '@/theme';

import { useMyFeedback, useSetFeedback } from '../hooks';

/** Fila "¿Qué tal esta pregunta?": 👍/👎 como interruptores; el voto es solo mío. */
export function QuestionFeedback({ questionId }: { questionId: string }) {
  const { spacing } = useTheme();
  const toast = useToast();
  const { vote } = useMyFeedback(questionId);
  const set = useSetFeedback();

  const press = (tapped: 1 | -1) => {
    haptic.light();
    set.mutate(
      { questionId, vote: nextFeedbackVote(vote, tapped) },
      { onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }) },
    );
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="muted">
        {FEEDBACK_TITLE}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Chip label={FEEDBACK_UP_LABEL} selected={vote === 1} onPress={() => press(1)} />
        <Chip label={FEEDBACK_DOWN_LABEL} selected={vote === -1} onPress={() => press(-1)} />
      </View>
      {vote === -1 ? (
        <Text variant="note" tone="muted">
          {FEEDBACK_DOWN_NOTE}
        </Text>
      ) : null}
    </View>
  );
}

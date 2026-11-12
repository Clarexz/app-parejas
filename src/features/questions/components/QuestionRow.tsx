import { View } from 'react-native';

import { Card, FruitDot, Text } from '@/components';
import { categoryRowState } from '@/lib/questionsView';
import type { CategoryQuestion } from '@/lib/questions';
import { useTheme } from '@/theme';

import { usePairFruits } from './usePairFruits';

type Props = {
  question: Pick<CategoryQuestion, 'text' | 'answered_by_me' | 'answered_by_partner'>;
  partnerName: string;
  onPress: () => void;
};

/** Renglón de una lista de preguntas (categoría o tema): texto, estado y quién ya contestó. */
export function QuestionRow({ question: q, partnerName, onPress }: Props) {
  const { spacing } = useTheme();
  const fruits = usePairFruits();
  const state = categoryRowState(q);
  const note =
    state === 'both'
      ? 'Contestaron los dos.'
      : state === 'mine'
        ? `Contestaste. Falta ${partnerName}.`
        : state === 'partner'
          ? `${partnerName} contestó. Te toca.`
          : null;
  return (
    <Card accessibilityLabel={note ? `${q.text}. ${note}` : q.text} onPress={onPress}>
      <Text variant="bodyStrong">{q.text}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="note" tone="muted" style={{ flex: 1 }}>
          {note ?? 'Sin contestar.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <View style={{ opacity: q.answered_by_me ? 1 : 0.25 }}>
            <FruitDot fruit={fruits.me} />
          </View>
          <View style={{ opacity: q.answered_by_partner ? 1 : 0.25 }}>
            <FruitDot fruit={fruits.partner} />
          </View>
        </View>
      </View>
    </Card>
  );
}

import { View } from 'react-native';

import { Card, FruitDot, Text } from '@/components';
import { answerExcerpt, historyPartnerLine } from '@/lib/questionsView';
import type { HistoryItem } from '@/lib/questions';
import { useTheme } from '@/theme';

import { usePairFruits } from './usePairFruits';

type Props = {
  item: HistoryItem;
  partnerName: string;
  timeZone: string;
  onPress: () => void;
};

/** Renglón del historial: la pregunta, la categoría y los dos `FruitDot` (llenos si ya contestó). */
export function HistoryCard({ item, partnerName, onPress }: Props) {
  const { spacing } = useTheme();
  const fruits = usePairFruits();
  const line = historyPartnerLine(item);
  const status =
    line.kind === 'answer'
      ? 'Contestaron los dos.'
      : line.kind === 'locked'
        ? `${partnerName} contestó. Te toca para leerla.`
        : item.mine
          ? `Ya contestaste. Falta ${partnerName}.`
          : 'Todavía sin contestar.';
  return (
    <Card onPress={onPress} accessibilityLabel={`${item.question.text}. ${status}`}>
      <Text variant="bodyStrong">{item.question.text}</Text>
      {item.mine ? (
        <Text variant="body" tone="muted" numberOfLines={2}>
          {answerExcerpt(item.mine, item.question)}
        </Text>
      ) : null}
      {line.kind === 'answer' ? (
        <Text variant="body" tone="muted" numberOfLines={2}>
          {line.text}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="note" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
          {line.kind === 'answer' ? item.question.category_name : status}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <View style={{ opacity: item.mine ? 1 : 0.25 }}>
            <FruitDot fruit={fruits.me} />
          </View>
          <View style={{ opacity: item.partner_answered ? 1 : 0.25 }}>
            <FruitDot fruit={fruits.partner} />
          </View>
        </View>
      </View>
    </Card>
  );
}

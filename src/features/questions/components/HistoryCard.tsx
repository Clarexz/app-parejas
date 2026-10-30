import { View } from 'react-native';

import { Card, Chip, Stamp, Text } from '@/components';
import {
  answerExcerpt,
  categoryColor,
  historyPartnerLine,
  historyStamp,
} from '@/lib/questionsView';
import type { HistoryItem } from '@/lib/questions';
import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

type Props = {
  item: HistoryItem;
  partnerName: string;
  timeZone: string;
  onPress: () => void;
};

/** Ficha del historial: pregunta, sello de fecha y extractos de las dos respuestas. */
export function HistoryCard({ item, partnerName, timeZone, onPress }: Props) {
  const { spacing } = useTheme();
  const line = historyPartnerLine(item);
  return (
    <Card
      tilt={tiltFor(item.question.id, 1)}
      onPress={onPress}
      accessibilityLabel={item.question.text}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Stamp tone="ink">{historyStamp(item, timeZone)}</Stamp>
        <Chip
          label={item.question.category_name}
          color={categoryColor(item.question.category)}
          style={{ flexShrink: 1 }}
        />
      </View>
      <Text variant="bodyStrong">{item.question.text}</Text>
      {item.mine ? (
        <View>
          <Text variant="caption" muted>
            Tú
          </Text>
          <Text variant="body">{answerExcerpt(item.mine, item.question)}</Text>
        </View>
      ) : null}
      <View>
        <Text variant="caption" muted>
          {partnerName}
        </Text>
        {line.kind === 'answer' ? (
          <Text variant="body">{line.text}</Text>
        ) : line.kind === 'locked' ? (
          <Text variant="body" tone="jamaica">
            {partnerName} contestó. Te toca para leerla.
          </Text>
        ) : (
          <Text variant="body" muted>
            Todavía no contesta.
          </Text>
        )}
      </View>
    </Card>
  );
}

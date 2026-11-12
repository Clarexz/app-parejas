import { View } from 'react-native';

import { Card, FruitDot, Icon, Text } from '@/components';
import { answerExcerpt, historyPartnerLine } from '@/lib/questionsView';
import { formatAudioDuration } from '@/lib/audio';
import type { AnswerInfo, HistoryItem } from '@/lib/questions';
import { useTheme } from '@/theme';

import { usePairFruits } from './usePairFruits';

type Props = {
  item: HistoryItem;
  partnerName: string;
  timeZone: string;
  onPress: () => void;
};

/** Texto de una respuesta en el renglón; con audio, una marca "Audio · 0:07" (se escucha al abrirla). */
function AnswerLine({ answer, item }: { answer: AnswerInfo; item: HistoryItem }) {
  const { colors, spacing } = useTheme();
  const excerpt = answerExcerpt(answer, item.question);
  const hasAudio = !!answer.audio_path && !!answer.audio_ms;
  return (
    <View style={{ gap: spacing.xs }}>
      {excerpt ? (
        <Text variant="body" tone="muted" numberOfLines={2}>
          {excerpt}
        </Text>
      ) : null}
      {hasAudio ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Icon name="mic" size={20} color={colors.inkMuted} />
          <Text variant="body" tone="muted">
            Audio · {formatAudioDuration(answer.audio_ms ?? 0)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

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
      {item.mine ? <AnswerLine answer={item.mine} item={item} /> : null}
      {line.kind === 'answer' && item.partner ? (
        <AnswerLine answer={item.partner} item={item} />
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

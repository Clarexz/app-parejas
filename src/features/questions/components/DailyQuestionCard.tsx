import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, LoadingLines, Stamp, Text } from '@/components';
import { useCouple } from '@/features/couple';
import { errorMessage } from '@/lib/errors';
import { commentCountLabel, questionErrorKind } from '@/lib/questionCopy';
import { cardState, type QuestionCard } from '@/lib/questions';
import { useTheme } from '@/theme';

import { useDailyQuestion } from '../hooks';

type ViewProps = {
  card: QuestionCard;
  partnerName: string;
  onPress: () => void;
};

/** La tarjeta con sus 3 estados (sin datos remotos: se prueba directo). */
export function DailyQuestionCardView({ card, partnerName, onPress }: ViewProps) {
  const { spacing } = useTheme();
  const state = cardState(card);
  const stamp = {
    unanswered: { tone: 'jamaica', text: 'TE TOCA' },
    waiting: { tone: 'ink', text: 'ESPERANDO' },
    both: { tone: 'nopal', text: 'LOS DOS CONTESTARON' },
  }[state] as { tone: 'jamaica' | 'ink' | 'nopal'; text: string };

  const footer =
    state === 'unanswered'
      ? card.partner_answered
        ? `${partnerName} ya escribió y la dobló. Te toca.`
        : `${partnerName} todavía no contesta.`
      : state === 'waiting'
        ? `Ya pegaste la tuya. ${partnerName} todavía no contesta.`
        : commentCountLabel(card.comment_count);

  return (
    <Card
      variant="ruled"
      tilt={-1}
      onPress={onPress}
      accessibilityLabel={`La pregunta del día: ${card.question.text}. ${stamp.text.toLowerCase()}. ${footer}`}
    >
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Stamp tone={stamp.tone}>{stamp.text}</Stamp>
          <Text variant="small" tone="muted">
            La pregunta del día
          </Text>
        </View>
        <Text variant="hand" numberOfLines={4}>
          {card.question.text}
        </Text>
        <Text variant="small" tone="muted">
          {footer}
        </Text>
      </View>
    </Card>
  );
}

/** Pregunta del día en Inicio: toca → pantalla de la pregunta de hoy (DISENO §8). */
export function DailyQuestionCard() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { partner } = useCouple();
  const { card, isLoading, isError, error, refetch } = useDailyQuestion();
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';

  if (isLoading) {
    return (
      <Card variant="ruled" tilt={-1}>
        <Text variant="title">La pregunta del día</Text>
        <LoadingLines count={2} accessibilityLabel="Cargando la pregunta del día" />
      </Card>
    );
  }

  if (isError || !card) {
    const none = questionErrorKind(error) === 'no_questions';
    return (
      <Card
        variant="ruled"
        tilt={-1}
        onPress={() => void refetch()}
        accessibilityLabel={`La pregunta del día. ${none ? 'Hoy no hay pregunta.' : 'No se pudo cargar.'} Toca para reintentar.`}
      >
        <View style={{ gap: spacing.sm }}>
          <Text variant="title">La pregunta del día</Text>
          <Text variant="body" tone="muted">
            {none
              ? 'Se nos acabaron las preguntas por hoy. Platiquen de lo que sea mientras vuelve el lápiz.'
              : `${errorMessage(error)} Toca para reintentar.`}
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <DailyQuestionCardView
      card={card}
      partnerName={partnerName}
      onPress={() => router.push('/question')}
    />
  );
}

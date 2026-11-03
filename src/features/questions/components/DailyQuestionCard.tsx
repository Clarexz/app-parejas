import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, Chip, LoadingSymbol, Text } from '@/components';
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
  const status = {
    unanswered: 'Te toca',
    waiting: 'Esperando',
    both: 'Contestaron los dos',
  }[state];

  const footer =
    state === 'unanswered'
      ? card.partner_answered
        ? `${partnerName} ya contestó. Te toca.`
        : `${partnerName} todavía no contesta.`
      : state === 'waiting'
        ? `Ya contestaste. Falta ${partnerName}.`
        : commentCountLabel(card.comment_count);

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`La pregunta del día: ${card.question.text}. ${status}. ${footer}`}
    >
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Text variant="label" tone="muted" style={{ flex: 1 }}>
            Pregunta del día
          </Text>
          <Chip label={status} selected={state === 'unanswered'} />
        </View>
        <Text variant="h3" numberOfLines={4}>
          {card.question.text}
        </Text>
        <Text variant="note" tone="muted">
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
      <Card>
        <Text variant="label" tone="muted">
          Pregunta del día
        </Text>
        <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
          <LoadingSymbol size={32} accessibilityLabel="Cargando la pregunta del día" />
        </View>
      </Card>
    );
  }

  if (isError || !card) {
    const none = questionErrorKind(error) === 'no_questions';
    return (
      <Card
        onPress={() => void refetch()}
        accessibilityLabel={`La pregunta del día. ${none ? 'Hoy no hay pregunta.' : 'No se pudo cargar.'} Toca para reintentar.`}
      >
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="muted">
            Pregunta del día
          </Text>
          <Text variant="body" tone="muted">
            {none
              ? 'Hoy se nos acabaron las preguntas. Platiquen de lo que sea mientras vuelven.'
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

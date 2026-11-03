import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, FruitDot, LoadingSymbol, Notice, Text } from '@/components';
import { useCouple, useFruits } from '@/features/couple';
import { useDailyQuestion } from '@/features/questions';
import { errorMessage } from '@/lib/errors';
import { FRUITS } from '@/lib/fruits';
import { questionErrorKind } from '@/lib/questionCopy';
import { cardState, type QuestionCard } from '@/lib/questions';
import { useTheme } from '@/theme';

type ViewProps = {
  card: QuestionCard;
  partnerName: string;
  onOpen: () => void;
};

/** Texto de estado y de quién es el punto, según quién ya contestó. */
export function questionStatus(card: QuestionCard, partnerName: string) {
  const state = cardState(card);
  if (state === 'both') return { text: 'Ya contestaron los dos.', dot: 'both' as const };
  if (state === 'waiting') {
    return { text: `Ya contestaste. Falta ${partnerName}.`, dot: 'me' as const };
  }
  return card.partner_answered
    ? { text: 'Ya contestó. Ahora tú.', dot: 'partner' as const }
    : { text: 'Te toca a ti.', dot: 'me' as const };
}

/** La tarjeta con la pregunta de hoy, quién va y el botón (sin datos remotos). */
export function QuestionCardView({ card, partnerName, onOpen }: ViewProps) {
  const { spacing } = useTheme();
  const fruits = useFruits();
  const partnerFruit = fruits.partner ?? FRUITS[fruits.me.suggested];
  const status = questionStatus(card, partnerName);
  const toAnswer = cardState(card) === 'unanswered';
  return (
    <Card style={{ padding: 20, gap: spacing.sm }}>
      <Text variant="label" tone="muted">
        Pregunta del día
      </Text>
      <Text variant="h3" numberOfLines={4}>
        {card.question.text}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          marginTop: spacing.xs,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {status.dot === 'both' ? (
            <View style={{ flexDirection: 'row', gap: 2 }}>
              <FruitDot fruit={fruits.me} />
              <FruitDot fruit={partnerFruit} />
            </View>
          ) : (
            <FruitDot fruit={status.dot === 'me' ? fruits.me : partnerFruit} />
          )}
          <Text variant="note" tone="muted" style={{ flex: 1 }}>
            {status.text}
          </Text>
        </View>
        <Button
          title={toAnswer ? 'Contestar' : 'Ver respuestas'}
          variant={toAnswer ? 'primary' : 'secondary'}
          size="sm"
          onPress={onOpen}
        />
      </View>
    </Card>
  );
}

/** Conectada a la pregunta de hoy; cargando y error con su propio diseño. */
export function HomeQuestionCard() {
  const router = useRouter();
  const { partner } = useCouple();
  const { card, isLoading, isError, error, refetch } = useDailyQuestion();
  const partnerName = partner?.nickname || partner?.display_name || 'tu pareja';

  if (isLoading) {
    return (
      <Card style={{ minHeight: 120, alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSymbol size={32} accessibilityLabel="Cargando la pregunta del día" />
      </Card>
    );
  }
  if (isError || !card) {
    if (questionErrorKind(error) === 'no_questions') {
      return (
        <Card style={{ padding: 20 }}>
          <Text variant="label" tone="muted">
            Pregunta del día
          </Text>
          <Text variant="body">Hoy se acabaron las preguntas. Platiquen de lo que sea.</Text>
        </Card>
      );
    }
    return (
      <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
        {`No pudimos traer la pregunta de hoy. ${errorMessage(error)}`}
      </Notice>
    );
  }
  return (
    <QuestionCardView
      card={card}
      partnerName={partnerName}
      onOpen={() => router.push('/question')}
    />
  );
}

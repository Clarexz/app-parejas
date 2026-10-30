import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { CloudOff, EmptyState, IconButton, LoadingLines, PencilNote, Screen } from '@/components';
import { QuestionView, useDailyQuestion, useQuestion } from '@/features/questions';
import { errorMessage } from '@/lib/errors';
import { questionErrorKind } from '@/lib/questionCopy';
import type { QuestionCard } from '@/lib/questions';
import { useTheme } from '@/theme';

type Source = {
  card: QuestionCard | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
};

function QuestionPage({ source }: { source: Source }) {
  const { spacing } = useTheme();
  const router = useRouter();
  const { card, isLoading, isError, error, refetch } = source;
  const kind = questionErrorKind(error);

  return (
    <Screen>
      <View style={{ flex: 1, gap: spacing.md }}>
        <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
          <IconButton name="back" accessibilityLabel="Volver" onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1 }}>
          {card ? (
            <QuestionView card={card} />
          ) : isLoading ? (
            <LoadingLines accessibilityLabel="Cargando la pregunta" />
          ) : isError && kind === 'no_questions' ? (
            <EmptyState
              illustration={<PencilNote />}
              title="Se nos acabaron las preguntas"
              body="Por hoy no hay pregunta para ustedes. Cuéntense algo sin que nadie pregunte, que también cuenta."
            />
          ) : isError && kind === 'not_found' ? (
            <EmptyState
              illustration={<PencilNote />}
              title="Esa hoja no está en el cuaderno"
              body={errorMessage({ code: 'question_not_found' })}
              actionLabel="Volver"
              onAction={() => router.back()}
            />
          ) : (
            <EmptyState
              illustration={<CloudOff />}
              title="No pudimos traer la pregunta"
              body={errorMessage(error)}
              actionLabel="Reintentar"
              onAction={() => void refetch()}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

function ById({ id }: { id: string }) {
  return <QuestionPage source={useQuestion(id)} />;
}

function ByDay({ day }: { day?: string }) {
  return <QuestionPage source={useDailyQuestion(day)} />;
}

/** Pregunta: `?id=<uuid>` (cualquiera), `?day=YYYY-MM-DD` (del día) o sin params (hoy). */
export default function QuestionScreen() {
  const { id, day } = useLocalSearchParams<{ id?: string; day?: string }>();
  return id ? <ById id={id} /> : <ByDay day={day} />;
}

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { EmptyState, Icon, LoadingSymbol, Screen, Text } from '@/components';
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Atrás"
          onPress={() => router.back()}
          hitSlop={spacing.sm}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginLeft: -spacing.xs,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="back" size={24} />
          <Text variant="ui">Atrás</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          {card ? (
            <QuestionView card={card} />
          ) : isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <LoadingSymbol accessibilityLabel="Cargando la pregunta" />
            </View>
          ) : isError && kind === 'no_questions' ? (
            <EmptyState
              art="bubble"
              title="Hoy se nos acabaron las preguntas"
              body="Por hoy no hay pregunta para ustedes. Cuéntense algo sin que nadie pregunte, que también cuenta."
            />
          ) : isError && kind === 'not_found' ? (
            <EmptyState
              art="bubble"
              title="Esa pregunta ya no está"
              body={errorMessage({ code: 'question_not_found' })}
              action={{ label: 'Volver', onPress: () => router.back() }}
            />
          ) : (
            <EmptyState
              art="circles"
              title="No pudimos traer la pregunta"
              body={errorMessage(error)}
              action={{ label: 'Reintentar', onPress: () => void refetch() }}
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

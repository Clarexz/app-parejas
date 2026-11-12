import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, EmptyState, LoadingSymbol, Notice, Sheet, Text } from '@/components';
import { useToast } from '@/components/Toast';
import { useCouple } from '@/features/couple';
import type { CustomQuestion } from '@/lib/customQuestions';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { useCustomQuestions, useRetireCustomQuestion } from '../hooks';

function answeredLine(q: CustomQuestion, partnerName: string): string {
  if (q.answered_by_me && q.answered_by_partner) return 'Contestaron los dos.';
  if (q.answered_by_me) return `Contestaste. Falta ${partnerName}.`;
  if (q.answered_by_partner) return `${partnerName} contestó. Te toca.`;
  return 'Todavía sin contestar.';
}

/** "Sus preguntas": las propias de la pareja, con "Retirar" (pide confirmación). */
export function CustomQuestionList() {
  const { spacing } = useTheme();
  const toast = useToast();
  const { partner } = useCouple();
  const { questions, isLoading, isError, refetch } = useCustomQuestions();
  const retire = useRetireCustomQuestion();
  const [target, setTarget] = useState<CustomQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';

  const confirm = async () => {
    if (!target) return;
    setError(null);
    try {
      await retire.mutateAsync(target.id);
      haptic.warning();
      setTarget(null);
      toast.show({ message: 'Listo, ya no va a salir.', tone: 'info' });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="h3" accessibilityRole="header">
        Sus preguntas
      </Text>
      {isLoading ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <LoadingSymbol size={32} accessibilityLabel="Cargando sus preguntas" />
        </View>
      ) : isError ? (
        <EmptyState
          art="circles"
          title="No pudimos traer sus preguntas"
          body="No pudimos conectarnos. Revisa tu internet y vuelve a intentar."
          action={{ label: 'Reintentar', onPress: () => void refetch() }}
        />
      ) : questions.length === 0 ? (
        <Text variant="body" tone="muted">
          Aquí aparecerán las que agreguen. ¿Cuál sería la primera?
        </Text>
      ) : (
        questions.map((q) => (
          <Card key={q.id}>
            <Text variant="note" tone="muted">
              {`${q.category_emoji} ${q.category_name}`}
            </Text>
            <Text variant="bodyStrong">{q.text}</Text>
            {q.options ? (
              <Text variant="note" tone="muted">
                {q.options.join(' · ')}
              </Text>
            ) : null}
            <Text variant="note" tone="muted">
              {answeredLine(q, partnerName)}
            </Text>
            <View style={{ alignItems: 'flex-start' }}>
              <Button
                title="Retirar"
                variant="ghost"
                size="sm"
                onPress={() => {
                  setError(null);
                  setTarget(q);
                }}
              />
            </View>
          </Card>
        ))
      )}

      <Sheet visible={!!target} onClose={() => setTarget(null)} title="¿Retirar esta pregunta?">
        <View style={{ gap: spacing.md }}>
          <Text variant="body">
            Deja de salir en la pregunta del día. Las respuestas que ya hay se quedan.
          </Text>
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <Button
            title="Retirar"
            variant="danger"
            fullWidth
            loading={retire.isPending}
            onPress={() => void confirm()}
          />
          <Button title="Mejor no" variant="ghost" fullWidth onPress={() => setTarget(null)} />
        </View>
      </Sheet>
    </View>
  );
}

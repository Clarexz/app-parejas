import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  View,
  type ScrollViewInstance,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  Button,
  Card,
  Chip,
  Doodle,
  FoldedNote,
  Icon,
  Input,
  Sheet,
  Stamp,
  Text,
} from '@/components';
import { useToast } from '@/components/Toast';
import { useCouple, useToday } from '@/features/couple';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { partnerFoldedLabel, questionTextVariant, sameChoice } from '@/lib/questionCopy';
import {
  ANSWER_MAX_LENGTH,
  CHOICE_NOTE_MAX_LENGTH,
  validateAnswerInput,
  type AnswerInfo,
  type QuestionCard,
  type QuestionInfo,
} from '@/lib/questions';
import { formatStampIsoDate } from '@/lib/stampDate';
import { useTheme } from '@/theme';

import { useCelebrationStore } from '../celebration';
import { useDeleteAnswer, useSendNudge, useSubmitAnswer } from '../hooks';
import { CommentComposer, CommentList } from './CommentThread';
import { categoryColor } from '@/lib/questionsView';

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

/** Sello "sellar" (DISENO §5): baja con escala 1.15→1 en `base`. */
function PastedStamp({ animate }: { animate: boolean }) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    progress.value = withTiming(1, {
      duration: reduced ? motion.duration.fast : motion.duration.base,
      easing: Easing.out(Easing.cubic),
    });
  }, [animate, reduced, motion, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: reduced ? [] : [{ scale: 1.15 - 0.15 * progress.value }],
  }));
  return (
    <Animated.View style={style}>
      <Stamp tone="nopal">PEGADA</Stamp>
    </Animated.View>
  );
}

/** Respuesta ya escrita: la opción elegida marcada (si es de opciones) y el texto. */
function AnswerBody({ question, answer }: { question: QuestionInfo; answer: AnswerInfo }) {
  const { colors, spacing } = useTheme();
  const option =
    question.type === 'choice' && answer.choice !== null
      ? (question.options?.[answer.choice] ?? null)
      : null;
  return (
    <View style={{ gap: spacing.sm }}>
      {option ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            borderWidth: 1.5,
            borderColor: colors.ink,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
          }}
        >
          <Icon name="check" size={20} color={colors.jamaica} />
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {option}
          </Text>
        </View>
      ) : null}
      {answer.text ? <Text variant="body">{answer.text}</Text> : null}
    </View>
  );
}

type FormProps = {
  question: QuestionInfo;
  initial: AnswerInfo | null;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (value: { text: string | null; choice: number | null }) => void;
  onCancel?: () => void;
};

/** Formulario de respuesta: renglones para escribir (open) o fichas para elegir (choice). */
function AnswerForm({ question, initial, submitting, submitLabel, onSubmit, onCancel }: FormProps) {
  const { colors, spacing } = useTheme();
  const [text, setText] = useState(initial?.text ?? '');
  const [choice, setChoice] = useState<number | null>(initial?.choice ?? null);
  const isChoice = question.type === 'choice';
  const max = isChoice ? CHOICE_NOTE_MAX_LENGTH : ANSWER_MAX_LENGTH;
  const length = Array.from(text).length;
  const over = length - max;
  const validation = validateAnswerInput(question, { text, choice });

  return (
    <View style={{ gap: spacing.md }}>
      {isChoice ? (
        <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
          {(question.options ?? []).map((option, i) => {
            const selected = choice === i;
            return (
              <Pressable
                key={option}
                onPress={() => setChoice(i)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={{
                  minHeight: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  backgroundColor: colors.paperRaised,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.ink : colors.ruled,
                }}
              >
                <Text variant={selected ? 'bodyStrong' : 'body'} style={{ flex: 1 }}>
                  {option}
                </Text>
                {selected ? <Icon name="check" size={20} color={colors.jamaica} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={{ gap: spacing.xs }}>
        <Input
          variant="multiline"
          label={isChoice ? 'Algo más que quieras decir (opcional)' : 'Tu respuesta'}
          value={text}
          onChangeText={setText}
          placeholder={isChoice ? undefined : 'Escribe con calma, aquí nadie te apura.'}
          error={
            over > 0 ? `Te pasaste por ${over} ${over === 1 ? 'letra' : 'letras'}.` : undefined
          }
        />
        <Text
          variant="mono"
          tone={over > 0 ? 'chile' : 'muted'}
          style={{ alignSelf: 'flex-end' }}
          accessibilityLabel={`${length} de ${max} caracteres`}
        >
          {length}/{max}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Button
          title={submitLabel}
          disabled={!validation.ok}
          loading={submitting}
          onPress={() => {
            if (validation.ok) onSubmit(validation.value);
          }}
        />
        {onCancel ? <Button title="Cancelar" variant="ghost" onPress={onCancel} /> : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------

/** Contenido de la pantalla de una pregunta (DISENO §8): contestar, ver a tu pareja y comentar. */
export function QuestionView({ card }: { card: QuestionCard }) {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const { me, partner } = useCouple();
  const { timeZone } = useToday();
  const submit = useSubmitAnswer();
  const remove = useDeleteAnswer();
  const nudge = useSendNudge();
  const celebrate = useCelebrationStore((s) => s.celebrate);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [editing, setEditing] = useState(false);
  const [stamped, setStamped] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { question, mine } = card;
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';
  const partnerOpen = !!mine && card.partner_answered && !!card.partner;
  const showForm = !mine || editing;

  const onSubmit = async (value: { text: string | null; choice: number | null }) => {
    try {
      const result = await submit.mutateAsync({ question, ...value });
      setEditing(false);
      setStamped(true);
      haptic.stamp();
      // Solo las preguntas del día cuentan para la racha.
      if (result.justCompleted && result.card.day) celebrate();
    } catch (e) {
      toast.show({ message: errorMessage(e), tone: 'error' });
    }
  };

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await remove.mutateAsync(question.id);
      setConfirming(false);
      setEditing(false);
      setStamped(false);
      toast.show({ message: 'Hoja arrancada. Puedes volver a contestar.', tone: 'info' });
    } catch (e) {
      setDeleteError(errorMessage(e));
    }
  };

  const onNudge = () =>
    nudge.mutate(undefined, {
      onSuccess: () => toast.show({ message: `Le avisamos a ${partnerName}.`, tone: 'success' }),
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
    });

  const matched = question.type === 'choice' && partnerOpen && sameChoice(card);

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.xl, paddingBottom: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Encabezado */}
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Stamp>{card.day ? formatStampIsoDate(card.day) : 'EXTRA'}</Stamp>
            <Chip
              label={question.category_name}
              color={categoryColor(question.category, question.intensity)}
            />
          </View>
          <Text variant={questionTextVariant(question.text)} accessibilityRole="header">
            {question.text}
          </Text>
        </View>

        {/* Mi respuesta */}
        {showForm ? (
          <AnswerForm
            key={editing ? 'edit' : 'new'}
            question={question}
            initial={editing ? mine : null}
            submitting={submit.isPending}
            submitLabel={editing ? 'Guardar cambios' : 'Pegar mi respuesta'}
            onSubmit={onSubmit}
            onCancel={editing ? () => setEditing(false) : undefined}
          />
        ) : mine ? (
          <View style={{ gap: spacing.sm }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text variant="hand" tone="muted">
                Tu respuesta
              </Text>
              <PastedStamp animate={stamped} />
            </View>
            <Card>
              <AnswerBody question={question} answer={mine} />
            </Card>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              <Button title="Editar" variant="ghost" onPress={() => setEditing(true)} />
              <Button
                title="Arrancar esta hoja"
                variant="ghost"
                onPress={() => {
                  setDeleteError(null);
                  setConfirming(true);
                }}
              />
            </View>
          </View>
        ) : null}

        {/* Respuesta de tu pareja: el mismo FoldedNote para que se desdoble al contestar */}
        <View key="partner" style={{ gap: spacing.sm }}>
          <Text variant="hand" tone="muted">
            {partnerOpen ? `Lo que puso ${partnerName}` : `La respuesta de ${partnerName}`}
          </Text>
          <FoldedNote
            open={partnerOpen}
            lockedLabel={partnerFoldedLabel(partnerName, card.partner_answered)}
          >
            {card.partner ? <AnswerBody question={question} answer={card.partner} /> : null}
          </FoldedNote>
          {matched ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Doodle kind="star" width={22} color={colors.nopal} />
              <Text variant="hand">¡Pusieron lo mismo!</Text>
            </View>
          ) : null}
          {mine && !card.partner_answered ? (
            <Button
              title={`Recuérdale a ${partnerName}`}
              variant="secondary"
              loading={nudge.isPending}
              onPress={onNudge}
            />
          ) : null}
        </View>

        {/* Comentarios: solo cuando ya contestaste */}
        {mine ? (
          <CommentList
            questionId={question.id}
            myId={me?.id ?? null}
            partnerName={partnerName}
            timeZone={timeZone}
          />
        ) : null}
      </ScrollView>

      {mine ? (
        <CommentComposer
          questionId={question.id}
          onSent={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
        />
      ) : null}

      <Sheet visible={confirming} onClose={() => setConfirming(false)} title="¿Arrancar esta hoja?">
        <View style={{ gap: spacing.md }}>
          <Text variant="body">
            Se borra tu respuesta y esta pregunta vuelve a quedar sin contestar. {partnerName}{' '}
            dejará de ver la tuya.
          </Text>
          {deleteError ? (
            <Text variant="small" tone="chile" accessibilityLiveRegion="polite">
              {deleteError}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Button title="Arrancar esta hoja" loading={remove.isPending} onPress={onDelete} />
            <Button title="Mejor no" variant="ghost" onPress={() => setConfirming(false)} />
          </View>
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

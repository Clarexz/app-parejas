import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';

import {
  AnswerCard,
  ArrivalOverlay,
  Button,
  Chip,
  FruitDot,
  Icon,
  Input,
  Notice,
  Sheet,
  Text,
} from '@/components';
import { useToast } from '@/components/Toast';
import { useCouple, useToday } from '@/features/couple';
import type { AudioDraft } from '@/lib/audio';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { sameChoice } from '@/lib/questionCopy';
import { answerDisplay } from '@/lib/questionsView';
import {
  ANSWER_MAX_LENGTH,
  CHOICE_NOTE_MAX_LENGTH,
  OTHER_CHOICE,
  validateAnswerInput,
  type AnswerInfo,
  type QuestionCard,
  type QuestionInfo,
} from '@/lib/questions';
import { useTheme } from '@/theme';

import { useCelebrationStore } from '../celebration';
import { useDeleteAnswer, useSendNudge, useStreak, useSubmitAnswer } from '../hooks';
import { AnswerAudio } from './AnswerAudio';
import { AUDIO_RECORDING_SUPPORTED, AudioRecorderField } from './AudioRecorderField';
import { CommentComposer, CommentList } from './CommentThread';
import { PackNext } from './PackNext';
import { QuestionFeedback } from './QuestionFeedback';
import { StreakChip } from './StreakChip';
import { usePairFruits } from './usePairFruits';

const LONG_QUESTION_CHARS = 140;

type AnswerValue = { text: string | null; choice: number | null; audio: AudioDraft | null };

/** Audio de una respuesta guardada (si lo tiene), para el `AnswerCard`. */
function answerAudio(answer: AnswerInfo, label: string) {
  if (!answer.audio_path || !answer.audio_ms) return undefined;
  return <AnswerAudio path={answer.audio_path} durationMs={answer.audio_ms} label={label} />;
}

type FormProps = {
  question: QuestionInfo;
  initial: AnswerInfo | null;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (value: AnswerValue) => void;
  onCancel?: () => void;
};

/** Formulario de respuesta: tu `Input` con foco en tu fruta, u opciones para elegir. */
function AnswerForm({ question, initial, submitting, submitLabel, onSubmit, onCancel }: FormProps) {
  const { colors, spacing, radius, fruit } = useTheme();
  const isChoice = question.type === 'choice';
  const [text, setText] = useState(
    !isChoice || initial?.choice === OTHER_CHOICE ? (initial?.text ?? '') : '',
  );
  const [choice, setChoice] = useState<number | null>(initial?.choice ?? null);
  const [audio, setAudio] = useState<AudioDraft | null>(
    !isChoice && initial?.audio_path && initial.audio_ms
      ? { kind: 'existing', path: initial.audio_path, ms: initial.audio_ms }
      : null,
  );
  const [recording, setRecording] = useState(false);
  const isOther = isChoice && choice === OTHER_CHOICE;
  // Respuestas viejas con opción + nota: la nota ya no se edita, pero se conserva tal cual.
  const legacyNote = isChoice && initial && initial.choice !== OTHER_CHOICE ? initial.text : null;
  const showInput = !isChoice || isOther;
  const max = isChoice ? CHOICE_NOTE_MAX_LENGTH : ANSWER_MAX_LENGTH;
  const length = Array.from(text).length;
  const over = length - max;
  const validation = validateAnswerInput(question, {
    text: !isChoice || isOther ? text : legacyNote,
    choice,
    hasAudio: !isChoice && !!audio,
  });

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <FruitDot fruit={fruit.me} />
        <Text variant="ui">Tú</Text>
      </View>
      {isChoice ? (
        <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
          {[
            ...(question.options ?? []).map((option, i) => ({ option, value: i })),
            { option: 'Otra', value: OTHER_CHOICE },
          ].map(({ option, value }) => {
            const selected = choice === value;
            return (
              <Pressable
                key={value}
                onPress={() => {
                  haptic.light();
                  setChoice(value);
                }}
                accessibilityRole="radio"
                accessibilityLabel={option}
                accessibilityState={{ selected }}
                style={{
                  minHeight: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.lg,
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: selected ? fruit.me.hex : 'transparent',
                }}
              >
                <Text variant={selected ? 'bodyStrong' : 'body'} style={{ flex: 1 }}>
                  {option}
                </Text>
                {selected ? <Icon name="check" size={20} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {showInput ? (
        <>
          <Input
            variant="multiline"
            label={isChoice ? 'Escribe tu opción' : undefined}
            accessibilityLabel={isChoice ? 'Tu opción' : 'Tu respuesta'}
            value={text}
            onChangeText={setText}
            placeholder={isChoice ? undefined : 'Escribe con calma, aquí nadie te apura.'}
            error={
              over > 0 ? `Te pasaste por ${over} ${over === 1 ? 'letra' : 'letras'}.` : undefined
            }
          />
          {length > max * 0.8 ? (
            <Text
              variant="note"
              tone={over > 0 ? 'danger' : 'muted'}
              style={{ alignSelf: 'flex-end' }}
              accessibilityLabel={`${length} de ${max} caracteres`}
            >
              {length}/{max}
            </Text>
          ) : null}
        </>
      ) : null}
      {!isChoice && (AUDIO_RECORDING_SUPPORTED || audio) ? (
        AUDIO_RECORDING_SUPPORTED ? (
          <AudioRecorderField
            value={audio}
            onChange={setAudio}
            disabled={submitting}
            onBusyChange={setRecording}
          />
        ) : audio?.kind === 'existing' ? (
          <AnswerAudio path={audio.path} durationMs={audio.ms} label="Tu audio" />
        ) : null
      ) : null}
      <Button
        title={submitLabel}
        fullWidth
        disabled={!validation.ok || recording}
        loading={submitting}
        onPress={() => {
          if (validation.ok) onSubmit({ ...validation.value, audio: isChoice ? null : audio });
        }}
      />
      {onCancel ? <Button title="Cancelar" variant="ghost" fullWidth onPress={onCancel} /> : null}
    </View>
  );
}

/**
 * Contenido de la pantalla de una pregunta (DISENO §8): contestar, ver a tu pareja y comentar.
 * `pack` (slug del tema) activa "Siguiente del tema" una vez contestada.
 */
export function QuestionView({ card, pack }: { card: QuestionCard; pack?: string }) {
  const { spacing } = useTheme();
  const toast = useToast();
  const { me, partner } = useCouple();
  const { timeZone } = useToday();
  const fruits = usePairFruits();
  const submit = useSubmitAnswer();
  const remove = useDeleteAnswer();
  const nudge = useSendNudge();
  const { streak } = useStreak();
  const celebrate = useCelebrationStore((s) => s.celebrate);
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const [editing, setEditing] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { question, mine } = card;
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';
  const partnerOpen = !!mine && card.partner_answered && !!card.partner;
  const showForm = !mine || editing;
  const long = Array.from(question.text).length > LONG_QUESTION_CHARS;

  const onSubmit = async (value: AnswerValue) => {
    try {
      const result = await submit.mutateAsync({ question, ...value });
      setEditing(false);
      const both = result.card.partner_answered;
      if (both) setJustRevealed(true);
      if (result.justCompleted && result.card.day) {
        // Las dos mitades llegan (ArrivalOverlay global, con la racha nueva).
        celebrate();
      } else if (both && !editing) {
        setArrived(true);
      } else {
        haptic.light();
      }
    } catch (e) {
      toast.show({ message: errorMessage(e), tone: 'danger' });
    }
  };

  const onDelete = async () => {
    setDeleteError(null);
    try {
      await remove.mutateAsync(question.id);
      setConfirming(false);
      setEditing(false);
      setJustRevealed(false);
      toast.show({ message: 'Listo, la borramos. Puedes volver a contestar.', tone: 'info' });
    } catch (e) {
      setDeleteError(errorMessage(e));
    }
  };

  const onNudge = () =>
    nudge.mutate(undefined, {
      onSuccess: () => {
        haptic.light();
        toast.show({ message: `Le avisamos a ${partnerName}.`, tone: 'success' });
      },
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }),
    });

  const matched = question.type === 'choice' && partnerOpen && sameChoice(card);

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.xl, paddingBottom: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Encabezado */}
        <View style={{ gap: spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.md,
            }}
          >
            <Text variant="label" tone="muted">
              {card.day ? 'Pregunta del día' : 'Pregunta extra'}
            </Text>
            {card.day && streak && streak.current > 0 ? <StreakChip days={streak.current} /> : null}
          </View>
          <Text variant={long ? 'h3' : 'h2'} accessibilityRole="header">
            {question.text}
          </Text>
          <Chip label={question.category_name} />
        </View>

        {/* Tu pareja: cerrada hasta que contestes */}
        {partnerOpen && card.partner ? (
          <AnswerCard
            fruit={fruits.partner}
            name={partnerName}
            text={answerDisplay(card.partner, question)}
            audio={answerAudio(card.partner, `Audio de ${partnerName}`)}
            reveal={justRevealed}
          />
        ) : card.partner_answered ? (
          <AnswerCard
            fruit={fruits.partner}
            name={`${partnerName} ya contestó`}
            locked
            lockedText="Se abre cuando contestes."
          />
        ) : null}

        {matched ? <Notice tone="success">Pusieron lo mismo.</Notice> : null}

        {/* Lo tuyo */}
        {showForm ? (
          <AnswerForm
            key={editing ? 'edit' : 'new'}
            question={question}
            initial={editing ? mine : null}
            submitting={submit.isPending}
            submitLabel={editing ? 'Guardar cambios' : 'Contestar'}
            onSubmit={onSubmit}
            onCancel={editing ? () => setEditing(false) : undefined}
          />
        ) : mine ? (
          <View style={{ gap: spacing.md }}>
            <AnswerCard
              fruit={fruits.me}
              name="Tú"
              text={answerDisplay(mine, question)}
              audio={answerAudio(mine, 'Tu audio')}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              <Button title="Editar" variant="ghost" onPress={() => setEditing(true)} />
              <Button
                title="Borrar mi respuesta"
                variant="ghost"
                onPress={() => {
                  setDeleteError(null);
                  setConfirming(true);
                }}
              />
            </View>
          </View>
        ) : null}

        {/* Tu pareja todavía no contesta: un toque ("pícale") */}
        {mine && !card.partner_answered ? (
          <View style={{ gap: spacing.md }}>
            <Notice tone="info">{`${partnerName} todavía no contesta.`}</Notice>
            <View style={{ alignItems: 'flex-start' }}>
              <Button
                title={`Pícale a ${partnerName}`}
                variant="secondary"
                loading={nudge.isPending}
                onPress={onNudge}
              />
            </View>
          </View>
        ) : null}

        {/* Si vienes de un tema: lo que sigue */}
        {pack && mine && !showForm ? <PackNext pack={pack} questionId={question.id} /> : null}

        <QuestionFeedback questionId={question.id} />

        {/* Comentarios: solo cuando ya contestaste */}
        {mine ? (
          <CommentList
            questionId={question.id}
            myId={me?.id ?? null}
            partnerName={partnerName}
            timeZone={timeZone}
            commentCount={card.comment_count}
          />
        ) : null}
      </KeyboardAwareScrollView>

      {mine ? (
        <CommentComposer
          questionId={question.id}
          onSent={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
        />
      ) : null}

      <Sheet
        visible={confirming}
        onClose={() => setConfirming(false)}
        title="¿Borrar tu respuesta?"
      >
        <View style={{ gap: spacing.md }}>
          <Text variant="body">
            La pregunta vuelve a quedar sin contestar y {partnerName} deja de ver la tuya.
          </Text>
          {deleteError ? <Notice tone="danger">{deleteError}</Notice> : null}
          <Button
            title="Borrar"
            variant="danger"
            fullWidth
            loading={remove.isPending}
            onPress={onDelete}
          />
          <Button title="Mejor no" variant="ghost" fullWidth onPress={() => setConfirming(false)} />
        </View>
      </Sheet>

      {arrived ? (
        <ArrivalOverlay text="Ya están los dos." onDone={() => setArrived(false)} />
      ) : null}
    </KeyboardAvoidingView>
  );
}

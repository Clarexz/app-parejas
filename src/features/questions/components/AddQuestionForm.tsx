import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, IconButton, Input, Notice, Segmented, Text } from '@/components';
import { useToast } from '@/components/Toast';
import {
  CUSTOM_OPTIONS_MAX,
  CUSTOM_OPTIONS_MIN,
  CUSTOM_TEXT_MAX,
  customQuestionMessages,
  validateCustomQuestion,
  type CustomIntensity,
} from '@/lib/customQuestions';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { ADD_QUESTION_NOTE } from '@/lib/questionCopy';
import type { QuestionType } from '@/lib/questions';
import { useTheme } from '@/theme';

import { useAddCustomQuestion, useCategories } from '../hooks';

const TYPE_OPTIONS = [
  { value: 'open', label: 'Abierta' },
  { value: 'choice', label: 'Con opciones' },
] as const;
const INTENSITY_OPTIONS = [
  { value: 'ligera', label: 'Ligera' },
  { value: 'profunda', label: 'Profunda' },
] as const;

const EMPTY_OPTIONS = ['', ''];

/**
 * Formulario de "Agregar una pregunta": categoría, tipo, texto, opciones e intensidad.
 * Valida con las mismas reglas que `add_custom_question`. Las picantes solo se ofrecen si están
 * activas para la pareja; en esa categoría la intensidad la pone el servidor.
 */
export function AddQuestionForm({ spicyActive }: { spicyActive: boolean }) {
  const { spacing } = useTheme();
  const toast = useToast();
  const { categories, isLoading, isError, refetch } = useCategories();
  const add = useAddCustomQuestion();
  const [category, setCategory] = useState<string | null>(null);
  const [type, setType] = useState<QuestionType>('open');
  const [text, setText] = useState('');
  const [options, setOptions] = useState<string[]>(EMPTY_OPTIONS);
  const [intensity, setIntensity] = useState<CustomIntensity>('ligera');
  const [serverError, setServerError] = useState<string | null>(null);

  const offered = categories.filter((c) => c.intensity !== 'picante' || spicyActive);
  const selected = categories.find((c) => c.slug === category);
  const isSpicy = selected?.intensity === 'picante';
  const result = validateCustomQuestion({ category, type, text, options, intensity });
  const messages = customQuestionMessages(result.ok ? {} : result.errors);
  const touchedOptions = options.some((o) => o.trim().length > 0);

  const submit = async () => {
    if (!result.ok) return;
    setServerError(null);
    try {
      await add.mutateAsync(result.value);
      haptic.success();
      toast.show({ message: 'Listo, ya está entre sus preguntas.', tone: 'success' });
      setText('');
      setOptions(EMPTY_OPTIONS);
    } catch (e) {
      setServerError(errorMessage(e));
    }
  };

  const setOption = (i: number, value: string) =>
    setOptions((prev) => prev.map((o, j) => (j === i ? value : o)));

  return (
    <View style={{ gap: spacing.xl }}>
      <Text variant="body" tone="muted">
        {ADD_QUESTION_NOTE}
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="muted">
          Categoría
        </Text>
        {isLoading ? (
          <Text variant="note" tone="muted">
            Cargando las categorías…
          </Text>
        ) : isError ? (
          <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
            No pudimos traer las categorías. Revisa tu internet y vuelve a intentar.
          </Notice>
        ) : (
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
          >
            {offered.map((c) => (
              <Chip
                key={c.slug}
                label={`${c.emoji} ${c.name}`}
                selected={category === c.slug}
                onPress={() => setCategory(c.slug)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="muted">
          Tipo
        </Text>
        <Segmented
          options={TYPE_OPTIONS}
          value={type}
          onChange={setType}
          accessibilityLabel="Tipo de pregunta"
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Input
          variant="multiline"
          label="La pregunta"
          accessibilityLabel="Texto de la pregunta"
          value={text}
          onChangeText={setText}
          placeholder="¿Qué te gustaría que hiciéramos juntos este año?"
          error={text.trim() ? (messages.text ?? undefined) : undefined}
        />
        {Array.from(text).length > CUSTOM_TEXT_MAX * 0.8 ? (
          <Text variant="note" tone="muted" style={{ alignSelf: 'flex-end' }}>
            {Array.from(text).length}/{CUSTOM_TEXT_MAX}
          </Text>
        ) : null}
      </View>

      {type === 'choice' ? (
        <View style={{ gap: spacing.md }}>
          <Text variant="label" tone="muted">
            Opciones
          </Text>
          {options.map((option, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input
                  accessibilityLabel={`Opción ${i + 1}`}
                  placeholder={`Opción ${i + 1}`}
                  value={option}
                  onChangeText={(v) => setOption(i, v)}
                />
              </View>
              {options.length > CUSTOM_OPTIONS_MIN ? (
                <IconButton
                  name="close"
                  variant="soft"
                  accessibilityLabel={`Quitar la opción ${i + 1}`}
                  onPress={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                />
              ) : null}
            </View>
          ))}
          {touchedOptions && messages.options ? (
            <Text variant="note" tone="danger">
              {messages.options}
            </Text>
          ) : null}
          {options.length < CUSTOM_OPTIONS_MAX ? (
            <Button
              title="Agregar opción"
              variant="secondary"
              size="sm"
              icon="plus"
              onPress={() => setOptions((prev) => [...prev, ''])}
            />
          ) : null}
          <Text variant="note" tone="muted">
            Quien conteste también puede escribir su propia opción.
          </Text>
        </View>
      ) : null}

      {isSpicy ? (
        <Notice tone="info">Esta entra como picante.</Notice>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="muted">
            Intensidad
          </Text>
          <Segmented
            options={INTENSITY_OPTIONS}
            value={intensity}
            onChange={setIntensity}
            accessibilityLabel="Intensidad"
          />
        </View>
      )}

      {serverError ? <Notice tone="danger">{serverError}</Notice> : null}

      <Button
        title="Agregar pregunta"
        fullWidth
        disabled={!result.ok}
        loading={add.isPending}
        onPress={() => void submit()}
      />
    </View>
  );
}

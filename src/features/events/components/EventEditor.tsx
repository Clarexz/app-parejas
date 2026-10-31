import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  CloudOff,
  DateField,
  EmptyPolaroid,
  EmptyState,
  IconButton,
  Input,
  LoadingLines,
  Paper,
  SealOverlay,
  Text,
  Toggle,
} from '@/components';
import { useToast } from '@/components/Toast';
import { useToday } from '@/features/couple';
import { isoDateToParts, partsToIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import {
  EVENT_EMOJI_MAX,
  EVENT_NOTE_MAX,
  EVENT_TITLE_MAX,
  eventErrorMessages,
  validateEventDraft,
} from '@/lib/eventsView';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { useDeleteEvent, useEvents, useSaveEvent } from '../hooks';

type Props = {
  /** Con id se edita; sin id se crea. */
  id?: string;
  /** Precarga "Es una visita" al crear. */
  kind?: string;
};

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      <Toggle
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        disabled={disabled}
      />
    </View>
  );
}

/** Pantalla `/events/edit`: crear, o editar con `?id=`; `?kind=visit` precarga una visita. */
export function EventEditor({ id, kind }: Props) {
  const editing = !!id;
  const { spacing, page } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { today } = useToday();
  const { events, isLoading, isError, refetch } = useEvents();
  const save = useSaveEvent();
  const remove = useDeleteEvent();

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('');
  const [note, setNote] = useState('');
  const [isVisit, setIsVisit] = useState(kind === 'visit');
  const [yearly, setYearly] = useState(false);
  const [date, setDate] = useState<DateParts>(() => isoDateToParts(today));
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [sealed, setSealed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // Al editar: se llenan los campos una sola vez con el evento cargado.
  const loaded = useMemo(
    () => (id ? (events.find((e) => e.id === id) ?? null) : null),
    [events, id],
  );
  if (editing && loaded && loadedId !== loaded.id) {
    setLoadedId(loaded.id);
    setTitle(loaded.title);
    setEmoji(loaded.emoji ?? '');
    setNote(loaded.note ?? '');
    setIsVisit(loaded.kind === 'visit');
    setYearly(loaded.kind !== 'visit' && loaded.recurring_yearly);
    setDate(isoDateToParts(loaded.date));
  }

  const parsedDate = partsToIsoDate(date);
  const errors = showErrors
    ? validateEventDraft({ title, emoji, note, dateValid: parsedDate.ok })
    : null;
  const messages = eventErrorMessages(errors, parsedDate.ok ? undefined : parsedDate.error);
  const busy = save.isPending || remove.isPending || sealed;

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/events');
  };

  const submit = () => {
    if (busy) return;
    setShowErrors(true);
    const issues = validateEventDraft({ title, emoji, note, dateValid: parsedDate.ok });
    if (issues || !parsedDate.ok) return;
    save.mutate(
      {
        id,
        title: title.trim(),
        date: parsedDate.value,
        kind: isVisit ? 'visit' : 'custom',
        emoji: emoji.trim() || null,
        recurringYearly: !isVisit && yearly,
        note: note.trim() || null,
      },
      {
        onSuccess: () => {
          setSealed(true);
          haptic.stamp();
          timer.current = setTimeout(leave, 800);
        },
        onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
      },
    );
  };

  const confirmDelete = () => {
    if (!id || busy) return;
    const run = () =>
      remove.mutate(id, {
        onSuccess: leave,
        onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
      });
    if (Platform.OS === 'web') {
      run();
      return;
    }
    Alert.alert(
      '¿Arrancar esta hoja?',
      'Esta fecha se borra para los dos y no se puede deshacer.',
      [
        { text: 'Mejor no', style: 'cancel' },
        { text: 'Arrancarla', style: 'destructive', onPress: run },
      ],
    );
  };

  // --- estados al editar ---
  if (editing && !loaded) {
    return (
      <View style={{ flex: 1 }}>
        <Paper />
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + spacing.md,
            paddingLeft: page.contentLeft,
            paddingRight: page.contentRight,
            gap: spacing.lg,
          }}
        >
          <View style={{ marginLeft: -spacing.sm }}>
            <IconButton name="close" accessibilityLabel="Cerrar" onPress={leave} />
          </View>
          {isLoading ? (
            <LoadingLines count={4} accessibilityLabel="Abriendo la fecha" />
          ) : isError ? (
            <EmptyState
              illustration={<CloudOff />}
              title="No pudimos abrir la fecha"
              body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
              actionLabel="Reintentar"
              onAction={() => void refetch()}
            />
          ) : (
            <EmptyState
              illustration={<EmptyPolaroid />}
              title="Esa hoja ya no está"
              body="Quizá la arrancaron desde el otro celular."
              actionLabel="Ir a Cuentas regresivas"
              onAction={() => router.replace('/events')}
            />
          )}
        </View>
      </View>
    );
  }

  const heading = editing
    ? isVisit
      ? 'Editar la visita'
      : 'Editar la fecha'
    : isVisit
      ? 'Apuntar la próxima visita'
      : 'Apuntar una fecha';

  return (
    <View style={{ flex: 1 }}>
      <Paper />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.xxxl,
          paddingLeft: page.contentLeft,
          paddingRight: page.contentRight,
          gap: spacing.xl,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -spacing.sm }}>
          <IconButton name="close" accessibilityLabel="Cerrar" onPress={leave} />
          <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
            {heading}
          </Text>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Input
            label="¿Qué es?"
            value={title}
            onChangeText={setTitle}
            maxLength={EVENT_TITLE_MAX}
            placeholder={isVisit ? 'Nos vemos en Guadalajara' : 'Nuestro concierto'}
            error={messages.title}
            editable={!busy}
          />
          <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
            {title.length}/{EVENT_TITLE_MAX}
          </Text>
        </View>

        <Input
          label="Emoji (opcional)"
          value={emoji}
          onChangeText={setEmoji}
          maxLength={EVENT_EMOJI_MAX}
          placeholder="✈️"
          error={messages.emoji}
          editable={!busy}
        />

        <ToggleRow
          label="Es una visita"
          hint="La próxima vez que se ven. Sale destacada arriba, en Inicio y en el widget."
          value={isVisit}
          onValueChange={setIsVisit}
          disabled={busy}
        />

        <DateField
          label={isVisit ? '¿Cuándo se ven?' : '¿Cuándo es?'}
          value={date}
          onChange={setDate}
          error={messages.date}
          disabled={busy}
        />

        {isVisit ? null : (
          <ToggleRow
            label="Se repite cada año"
            hint="Para cumpleaños, aniversarios y fechas que vuelven."
            value={yearly}
            onValueChange={setYearly}
            disabled={busy}
          />
        )}

        <View style={{ gap: spacing.xs }}>
          <Input
            label="Una nota (opcional)"
            variant="multiline"
            value={note}
            onChangeText={setNote}
            maxLength={EVENT_NOTE_MAX}
            placeholder="Lo que no se les vaya a olvidar"
            error={messages.note}
            editable={!busy}
          />
          <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
            {note.length}/{EVENT_NOTE_MAX}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-start', gap: spacing.md }}>
          <Button
            title={editing ? 'Guardar los cambios' : 'Apuntar'}
            onPress={submit}
            loading={save.isPending}
            disabled={busy}
          />
          {editing ? (
            <Button
              title="Arrancar esta hoja"
              variant="ghost"
              onPress={confirmDelete}
              disabled={busy}
            />
          ) : null}
        </View>
      </ScrollView>
      {sealed ? <SealOverlay label="APUNTADA" /> : null}
    </View>
  );
}

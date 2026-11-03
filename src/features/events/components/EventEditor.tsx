import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import {
  ArrivalOverlay,
  Button,
  DateField,
  EmptyState,
  Input,
  LoadingSymbol,
  Notice,
  Screen,
  ScreenHeader,
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
          <Text variant="note" tone="muted">
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
  const { spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
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
        onSuccess: () => setSealed(true),
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
    Alert.alert('¿Borrar esta fecha?', 'Se borra para los dos y no se puede deshacer.', [
      { text: 'Mejor no', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: run },
    ]);
  };

  // --- estados al editar ---
  if (editing && !loaded) {
    return (
      <Screen>
        <ScreenHeader back="Cuentas regresivas" onBack={leave} title="Fecha" />
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <LoadingSymbol accessibilityLabel="Abriendo la fecha" />
          </View>
        ) : isError ? (
          <View style={{ marginTop: spacing.xl }}>
            <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
              No pudimos abrir la fecha. Revisa tu señal e intenta otra vez.
            </Notice>
          </View>
        ) : (
          <EmptyState
            art="symbol"
            title="Esa fecha ya no está"
            body="Quizá la borraron desde el otro celular."
            action={{ label: 'Ir a Cuentas regresivas', onPress: () => router.replace('/events') }}
          />
        )}
      </Screen>
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
      <Screen scroll>
        <View style={{ gap: spacing.xl }}>
          <ScreenHeader back="Cuentas regresivas" onBack={leave} title={heading} />

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
            <Text variant="note" tone="muted" accessibilityLiveRegion="polite">
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
              label="Cada año"
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
            <Text variant="note" tone="muted" accessibilityLiveRegion="polite">
              {note.length}/{EVENT_NOTE_MAX}
            </Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Button
              title={editing ? 'Guardar los cambios' : 'Apuntar'}
              onPress={submit}
              loading={save.isPending}
              disabled={busy}
              fullWidth
            />
            {editing ? (
              <Button
                title="Borrar esta fecha"
                variant="danger"
                onPress={confirmDelete}
                disabled={busy}
                fullWidth
              />
            ) : null}
          </View>
        </View>
      </Screen>
      {sealed ? <ArrivalOverlay text="Apuntada." onDone={leave} /> : null}
    </View>
  );
}

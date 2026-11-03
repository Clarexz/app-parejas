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
import { useEvents } from '@/features/events';
import { isoDateToParts, partsToIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import {
  MAX_VISIT_DAYS,
  VISIT_NOTE_MAX,
  VISIT_PLACE_MAX,
  findOverlap,
  validateVisit,
  visitLength,
  visitRangeLabel,
} from '@/lib/visits';
import { useTheme } from '@/theme';

import { useDeleteVisit, useSaveVisit, useVisits } from '../hooks';

type Props = {
  /** Con id se edita; sin id se crea. */
  id?: string;
  /** Prellena desde una cuenta regresiva de visita (llegada = despedida = su fecha) y la liga. */
  eventId?: string;
};

type FieldErrors = { start?: string; end?: string };

/** Errores por campo, con el mismo criterio que `save_visit` y el aviso de traslape. */
function fieldErrors(args: {
  start: ReturnType<typeof partsToIsoDate>;
  end: ReturnType<typeof partsToIsoDate>;
  today: string;
  visits: Parameters<typeof findOverlap>[0];
  ignoreId?: string;
}): FieldErrors {
  const { start, end, today, visits, ignoreId } = args;
  const out: FieldErrors = {};
  if (!start.ok) out.start = start.error;
  if (!end.ok) out.end = end.error;
  if (!start.ok || !end.ok) return out;
  if (start.value > today) {
    out.start =
      'La llegada no puede ser después de hoy. Si siguen juntos, pon hoy y la despedida que esperan.';
  } else if (end.value < start.value) {
    out.end = 'La despedida no puede ser antes de la llegada.';
  } else if (visitLength({ start_date: start.value, end_date: end.value }) > MAX_VISIT_DAYS) {
    out.end = 'Una visita dura máximo un año.';
  } else {
    const clash = findOverlap(visits, { start: start.value, end: end.value }, ignoreId);
    if (clash) out.end = `Se enciman con la visita del ${visitRangeLabel(clash)}.`;
  }
  if (!out.start && !out.end && validateVisit({ start: start.value, end: end.value, today })) {
    out.end = 'Revisa las fechas de la visita.';
  }
  return out;
}

/** Pantalla `/visits/edit`: apuntar una visita, o editarla con `?id=`; `?eventId=` la prellena. */
export function VisitEditor({ id, eventId }: Props) {
  const editing = !!id;
  const { spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { today } = useToday();
  const { visits, isLoading, isError, refetch } = useVisits();
  const { events } = useEvents();
  const save = useSaveVisit();
  const remove = useDeleteVisit();

  const [start, setStart] = useState<DateParts>(() => isoDateToParts(today));
  const [end, setEnd] = useState<DateParts>(() => isoDateToParts(today));
  const [oneDay, setOneDay] = useState(!editing);
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [linkedEvent, setLinkedEvent] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [sealed, setSealed] = useState(false);

  // Al editar: se llenan los campos una sola vez con la visita cargada.
  const loaded = useMemo(
    () => (id ? (visits.find((v) => v.id === id) ?? null) : null),
    [visits, id],
  );
  if (editing && loaded && loadedId !== loaded.id) {
    setLoadedId(loaded.id);
    setStart(isoDateToParts(loaded.start_date));
    setEnd(isoDateToParts(loaded.end_date));
    setOneDay(loaded.start_date === loaded.end_date);
    setPlace(loaded.place ?? '');
    setNote(loaded.note ?? '');
    setLinkedEvent(loaded.event_id);
  }

  // Desde una cuenta regresiva: llegada = despedida = su fecha, y se liga.
  const fromEvent = useMemo(
    () => (!editing && eventId ? (events.find((e) => e.id === eventId) ?? null) : null),
    [editing, eventId, events],
  );
  if (fromEvent && !prefilled) {
    setPrefilled(true);
    const date = isoDateToParts(fromEvent.date);
    setStart(date);
    setEnd(date);
    setOneDay(true);
    setLinkedEvent(fromEvent.id);
  }

  const startParsed = partsToIsoDate(start);
  const endParsed = oneDay ? startParsed : partsToIsoDate(end);
  const errors = showErrors
    ? fieldErrors({
        start: startParsed,
        end: endParsed,
        today,
        visits,
        ignoreId: id,
      })
    : {};
  const busy = save.isPending || remove.isPending || sealed;

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/visits');
  };

  const submit = () => {
    if (busy) return;
    setShowErrors(true);
    const issues = fieldErrors({ start: startParsed, end: endParsed, today, visits, ignoreId: id });
    if (issues.start || issues.end || !startParsed.ok || !endParsed.ok) return;
    save.mutate(
      {
        id,
        startDate: startParsed.value,
        endDate: endParsed.value,
        place: place.trim() || null,
        note: note.trim() || null,
        eventId: linkedEvent,
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
    Alert.alert('¿Borrar esta visita?', 'Se borra para los dos y no se puede deshacer.', [
      { text: 'Mejor no', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: run },
    ]);
  };

  // --- estados al editar ---
  if (editing && !loaded) {
    return (
      <Screen>
        <ScreenHeader back="Visitas" onBack={leave} title="Visita" />
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <LoadingSymbol accessibilityLabel="Abriendo la visita" />
          </View>
        ) : isError ? (
          <View style={{ marginTop: spacing.xl }}>
            <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
              No pudimos abrir la visita. Revisa tu señal e intenta otra vez.
            </Notice>
          </View>
        ) : (
          <EmptyState
            art="symbol"
            title="Esa visita ya no está"
            body="Quizá la borraron desde el otro celular."
            action={{ label: 'Ir a Visitas', onPress: () => router.replace('/visits') }}
          />
        )}
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <View style={{ gap: spacing.xl }}>
          <ScreenHeader
            back="Visitas"
            onBack={leave}
            title={editing ? 'Editar la visita' : 'Apuntar una visita'}
          />

          <DateField
            label={oneDay ? '¿Qué día se vieron?' : 'Llegada'}
            value={start}
            onChange={setStart}
            error={errors.start}
            disabled={busy}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="bodyStrong">Fue un solo día</Text>
              <Text variant="note" tone="muted">
                Llegada y despedida el mismo día.
              </Text>
            </View>
            <Toggle
              value={oneDay}
              onValueChange={setOneDay}
              accessibilityLabel="Fue un solo día"
              disabled={busy}
            />
          </View>

          {oneDay ? null : (
            <DateField
              label="Despedida"
              value={end}
              onChange={setEnd}
              error={errors.end}
              disabled={busy}
            />
          )}
          {oneDay && errors.end ? <Notice tone="danger">{errors.end}</Notice> : null}

          <Input
            label="¿Dónde fue? (opcional)"
            value={place}
            onChangeText={setPlace}
            maxLength={VISIT_PLACE_MAX}
            placeholder="Guadalajara"
            editable={!busy}
          />

          <View style={{ gap: spacing.xs }}>
            <Input
              label="Una nota (opcional)"
              variant="multiline"
              value={note}
              onChangeText={setNote}
              maxLength={VISIT_NOTE_MAX}
              placeholder="Lo que no quieren olvidar de esos días"
              editable={!busy}
            />
            <Text variant="note" tone="muted" accessibilityLiveRegion="polite">
              {note.length}/{VISIT_NOTE_MAX}
            </Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Button
              title={editing ? 'Guardar los cambios' : 'Apuntar visita'}
              onPress={submit}
              loading={save.isPending}
              disabled={busy}
              fullWidth
            />
            {editing ? (
              <Button
                title="Borrar esta visita"
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

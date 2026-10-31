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
import { useEvents } from '@/features/events';
import { isoDateToParts, partsToIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
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
  const { spacing, page } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

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
      'Esta visita se borra para los dos y no se puede deshacer.',
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
            <LoadingLines count={4} accessibilityLabel="Abriendo la visita" />
          ) : isError ? (
            <EmptyState
              illustration={<CloudOff />}
              title="No pudimos abrir la visita"
              body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
              actionLabel="Reintentar"
              onAction={() => void refetch()}
            />
          ) : (
            <EmptyState
              illustration={<EmptyPolaroid />}
              title="Esa hoja ya no está"
              body="Quizá la arrancaron desde el otro celular."
              actionLabel="Ir a Visitas"
              onAction={() => router.replace('/visits')}
            />
          )}
        </View>
      </View>
    );
  }

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
            {editing ? 'Editar la visita' : 'Apuntar una visita'}
          </Text>
        </View>

        <DateField
          label={oneDay ? '¿Qué día se vieron?' : 'Llegada'}
          value={start}
          onChange={(parts) => {
            setStart(parts);
          }}
          error={errors.start}
          disabled={busy}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text variant="bodyStrong">Fue un solo día</Text>
            <Text variant="caption" tone="muted">
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
        {oneDay && errors.end ? (
          <Text variant="caption" tone="chile" accessibilityLiveRegion="polite">
            {errors.end}
          </Text>
        ) : null}

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
          <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
            {note.length}/{VISIT_NOTE_MAX}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-start', gap: spacing.md }}>
          <Button
            title={editing ? 'Guardar los cambios' : 'Apuntar visita'}
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

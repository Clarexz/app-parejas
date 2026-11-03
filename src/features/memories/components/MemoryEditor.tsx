import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Linking,
  Platform,
  type LayoutChangeEvent,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  ArrivalOverlay,
  Button,
  DateField,
  EmptyState,
  FieldError,
  Icon,
  Input,
  LoadingSymbol,
  Notice,
  Screen,
  ScreenHeader,
  Sheet,
  Text,
} from '@/components';
import { useToast } from '@/components/Toast';
import { useToday } from '@/features/couple';
import { addDays } from '@/lib/dates';
import { isoDateToParts, partsToIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import type { LatLng } from '@/lib/geo';
import {
  MEMORY_BODY_MAX,
  MEMORY_PHOTOS_MAX,
  MEMORY_PLACE_MAX,
  MEMORY_TITLE_MAX,
  exifDate,
  exifLocation,
  moveItem,
  photoCountLabel,
  validateMemoryDraft,
  type MemoryDraftErrors,
} from '@/lib/memories';
import { useTheme } from '@/theme';

import type { MemoryPhotoInput } from '../api';
import { useMemory, useMemoryPhotoUrls, useSaveMemory } from '../hooks';
import { PhotoGrid } from './PhotoGrid';
import { PlacePicker } from './PlacePicker';

type EditorPhoto = { key: string; input: MemoryPhotoInput };

/** Mensajes de validación en español de México (qué pasó y qué hacer). */
export function memoryErrorMessages(
  errors: MemoryDraftErrors,
  dateError?: string,
): Record<'title' | 'body' | 'place' | 'photos' | 'date', string | undefined> {
  return {
    title:
      errors.title === 'empty'
        ? 'Ponle un título a la memoria.'
        : errors.title === 'too_long'
          ? `El título aguanta hasta ${MEMORY_TITLE_MAX} letras.`
          : undefined,
    body: errors.body ? `El texto aguanta hasta ${MEMORY_BODY_MAX} letras.` : undefined,
    place: errors.place ? `El lugar aguanta hasta ${MEMORY_PLACE_MAX} letras.` : undefined,
    photos:
      errors.photos === 'none'
        ? 'Agrega al menos una foto.'
        : errors.photos === 'too_many'
          ? `Caben hasta ${MEMORY_PHOTOS_MAX} fotos por memoria.`
          : undefined,
    date: errors.date
      ? errors.date === 'future'
        ? 'Esa fecha todavía no llega.'
        : (dateError ?? 'Escribe una fecha que exista, como 14 / 02 / 2023.')
      : undefined,
  };
}

function snapshotOf(v: {
  title: string;
  body: string;
  placeName: string;
  pin: LatLng | null;
  date: DateParts;
  photos: EditorPhoto[];
}): string {
  return JSON.stringify([v.title, v.body, v.placeName, v.pin, v.date, v.photos.map((p) => p.key)]);
}

/**
 * Crear (`/memory/edit`) o editar (`/memory/edit?id=`) una memoria: fotos de galería o cámara en
 * una rejilla reordenable, título, fecha, texto y lugar (con el EXIF de la primera foto).
 */
export function MemoryEditor({ id }: { id?: string }) {
  const editing = !!id;
  const theme = useTheme();
  const { colors, spacing, radius, page } = theme;
  const router = useRouter();
  const toast = useToast();
  const { width: windowWidth } = useWindowDimensions();
  const { today } = useToday();
  const save = useSaveMemory();
  const existing = useMemory(id);

  // El ancho real lo mide `onLayout`; mientras tanto, pantalla menos los dos gutters.
  const [measured, setMeasured] = useState(0);
  const contentWidth = measured || windowWidth - page.gutter * 2;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [pin, setPin] = useState<LatLng | null>(null);
  const [date, setDateParts] = useState<DateParts>(() => isoDateToParts(today));
  const [photos, setPhotos] = useState<EditorPhoto[]>([]);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [baseline, setBaseline] = useState(() =>
    snapshotOf({
      title: '',
      body: '',
      placeName: '',
      pin: null,
      date: isoDateToParts(today),
      photos: [],
    }),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  // La fecha de hoy es solo una sugerencia: el EXIF de la foto la puede reemplazar hasta que
  // la persona la toque (al editar, la fecha guardada ya cuenta como elegida).
  const dateTouched = useRef(editing);
  const counter = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Al editar: se llenan los campos una sola vez con la memoria cargada.
  const loaded = existing.memory;
  if (editing && loaded && loadedId !== loaded.id) {
    setLoadedId(loaded.id);
    const initialPhotos: EditorPhoto[] = loaded.photos.map((p) => ({
      key: p.path,
      input: {
        kind: 'existing',
        path: p.path,
        thumbPath: p.thumb_path,
        width: p.width,
        height: p.height,
      },
    }));
    const initial = {
      title: loaded.title,
      body: loaded.body ?? '',
      placeName: loaded.place_name ?? '',
      pin: loaded.lat != null && loaded.lng != null ? { lat: loaded.lat, lng: loaded.lng } : null,
      date: isoDateToParts(loaded.happened_on),
      photos: initialPhotos,
    };
    setTitle(initial.title);
    setBody(initial.body);
    setPlaceName(initial.placeName);
    setPin(initial.pin);
    setDateParts(initial.date);
    setPhotos(initialPhotos);
    setBaseline(snapshotOf(initial));
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const existingThumbs = useMemo(
    () => photos.flatMap((p) => (p.input.kind === 'existing' ? [p.input.thumbPath] : [])),
    [photos],
  );
  const { urls } = useMemoryPhotoUrls(existingThumbs);
  const gridItems = photos.map((p) => ({
    key: p.key,
    uri: p.input.kind === 'new' ? p.input.uri : urls[p.input.thumbPath],
  }));

  const dirty = snapshotOf({ title, body, placeName, pin, date, photos }) !== baseline;
  const publishing = save.isPending;
  const room = MEMORY_PHOTOS_MAX - photos.length;

  const parsedDate = partsToIsoDate(date);
  const errors = showErrors
    ? validateMemoryDraft(
        {
          title,
          body,
          placeName,
          happenedOn: parsedDate.ok ? parsedDate.value : null,
          photoCount: photos.length,
        },
        today,
      )
    : null;
  const messages: Partial<ReturnType<typeof memoryErrorMessages>> = errors
    ? memoryErrorMessages(errors, parsedDate.ok ? undefined : parsedDate.error)
    : {};

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/memories');
  }, [router]);

  const requestClose = useCallback(() => {
    if (publishing || saved) return;
    if (dirty) setConfirmClose(true);
    else leave();
  }, [publishing, saved, dirty, leave]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => sub.remove();
  }, [requestClose]);

  // --- fotos ---

  const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const accepted = assets.slice(0, room);
    if (accepted.length === 0) return;
    setPhotos((prev) => [
      ...prev,
      ...accepted.map((a) => {
        counter.current += 1;
        return {
          key: `new:${counter.current}`,
          input: { kind: 'new', uri: a.uri, width: a.width, height: a.height } as MemoryPhotoInput,
        };
      }),
    ]);
    if (assets.length > accepted.length) {
      toast.show({ message: `Solo caben ${MEMORY_PHOTOS_MAX} fotos. Dejamos las primeras.` });
    }

    // Con la primera foto que traiga EXIF se llenan fecha y lugar que sigan vacíos.
    let tookPlace = false;
    let tookDate = false;
    for (const asset of accepted) {
      const place = exifLocation(asset.exif);
      const when = exifDate(asset.exif);
      if (!place && !when) continue;
      if (place && !pin) {
        setPin(place);
        tookPlace = true;
      }
      if (when && !dateTouched.current && when <= addDays(today, 1)) {
        setDateParts(isoDateToParts(when));
        tookDate = true;
      }
      break;
    }
    if (tookPlace || tookDate) {
      toast.show({
        message: tookPlace
          ? tookDate
            ? 'Tomé la fecha y el lugar de la foto.'
            : 'Tomé el lugar de la foto.'
          : 'Tomé la fecha de la foto.',
        tone: 'success',
      });
    }
  };

  const fromLibrary = async () => {
    if (room <= 0) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: room,
        exif: true,
        quality: 1,
      });
      if (!result.canceled) addAssets(result.assets);
    } catch (e) {
      toast.show({ message: errorMessage(e), tone: 'error' });
    }
  };

  const fromCamera = async () => {
    if (room <= 0) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setCameraDenied(true);
        return;
      }
      setCameraDenied(false);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        exif: true,
        quality: 1,
      });
      if (!result.canceled) addAssets(result.assets);
    } catch (e) {
      toast.show({ message: errorMessage(e), tone: 'error' });
    }
  };

  // --- guardar ---

  const publish = () => {
    if (publishing) return;
    setShowErrors(true);
    const issues = validateMemoryDraft(
      {
        title,
        body,
        placeName,
        happenedOn: parsedDate.ok ? parsedDate.value : null,
        photoCount: photos.length,
      },
      today,
    );
    if (issues || !parsedDate.ok) return;
    save.mutate(
      {
        id,
        title: title.trim(),
        happenedOn: parsedDate.value,
        body: body.trim() || null,
        lat: pin?.lat ?? null,
        lng: pin?.lng ?? null,
        placeName: placeName.trim() || null,
        photos: photos.map((p) => p.input),
        onProgress: setProgress,
      },
      {
        onSuccess: (memory) => {
          setSaved(true);
          timer.current = setTimeout(() => {
            if (editing) leave();
            else router.replace({ pathname: '/memory/[id]', params: { id: memory.id } });
          }, 900);
        },
        onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
      },
    );
  };

  const heading = editing ? 'Editar memoria' : 'Nueva memoria';

  // --- estados al editar ---
  if (editing && !loaded) {
    return (
      <Screen>
        <ScreenHeader title={heading} back="Cancelar" onBack={leave} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {existing.isLoading ? (
            <View style={{ alignItems: 'center' }}>
              <LoadingSymbol accessibilityLabel="Abriendo la memoria" />
            </View>
          ) : existing.isError ? (
            <Notice
              tone="danger"
              action={{ label: 'Reintentar', onPress: () => void existing.refetch() }}
            >
              No pudimos abrir la memoria. Revisa tu internet y vuelve a intentar.
            </Notice>
          ) : (
            <EmptyState
              art="symbol"
              title="Esa memoria ya no está"
              body="Quizá la borraron desde el otro celular."
              action={{ label: 'Ir a Memorias', onPress: () => router.replace('/memories') }}
            />
          )}
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!dragging}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        >
          <View
            style={{ gap: spacing.xl }}
            onLayout={(e: LayoutChangeEvent) => setMeasured(Math.round(e.nativeEvent.layout.width))}
          >
            <ScreenHeader title={heading} back="Cancelar" onBack={requestClose} />

            {/* Fotos */}
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                <Text variant="label" tone="muted" style={{ flex: 1 }}>
                  Fotos
                </Text>
                <Text variant="note" tone="muted" accessibilityLiveRegion="polite">
                  {photos.length}/{MEMORY_PHOTOS_MAX}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
                <Button
                  title="Galería"
                  variant="secondary"
                  icon="photo"
                  disabled={room <= 0 || publishing}
                  onPress={() => void fromLibrary()}
                />
                <Button
                  title="Cámara"
                  variant="secondary"
                  icon="camera"
                  disabled={room <= 0 || publishing}
                  onPress={() => void fromCamera()}
                />
              </View>
              {cameraDenied ? (
                <Notice
                  action={{ label: 'Abrir ajustes', onPress: () => void Linking.openSettings() }}
                >
                  Para tomar la foto necesitamos permiso de cámara. Actívalo en los ajustes del
                  celular, o elige una de la galería.
                </Notice>
              ) : null}
              {photos.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <PhotoGrid
                    items={gridItems}
                    width={contentWidth}
                    disabled={publishing}
                    onMove={(from, to) => setPhotos((prev) => moveItem(prev, from, to))}
                    onRemove={(key) => setPhotos((prev) => prev.filter((p) => p.key !== key))}
                    onDragChange={setDragging}
                  />
                  <Text variant="note" tone="muted">
                    {photos.length > 1
                      ? 'Mantén presionada una foto y arrástrala para cambiar el orden. La primera es la portada.'
                      : `${photoCountLabel(1)}: esa es la portada.`}
                  </Text>
                </View>
              ) : null}
              {messages.photos ? <FieldError>{messages.photos}</FieldError> : null}
            </View>

            {/* Título */}
            <View style={{ gap: spacing.xs }}>
              <Input
                label="Título"
                value={title}
                onChangeText={setTitle}
                maxLength={MEMORY_TITLE_MAX}
                placeholder="Como se llame ese día"
                error={messages.title}
                editable={!publishing}
              />
              <Text variant="note" tone="muted" accessibilityLiveRegion="polite">
                {title.length}/{MEMORY_TITLE_MAX}
              </Text>
            </View>

            <DateField
              label="¿Cuándo fue?"
              value={date}
              onChange={(parts) => {
                dateTouched.current = true;
                setDateParts(parts);
              }}
              error={messages.date}
              disabled={publishing}
            />

            {/* Texto */}
            <View style={{ gap: spacing.xs }}>
              <Input
                label="Lo que quieras recordar (opcional)"
                variant="multiline"
                value={body}
                onChangeText={setBody}
                maxLength={MEMORY_BODY_MAX}
                error={messages.body}
                editable={!publishing}
              />
              <Text variant="note" tone="muted" accessibilityLiveRegion="polite">
                {body.length}/{MEMORY_BODY_MAX}
              </Text>
            </View>

            {/* Lugar */}
            <View style={{ gap: spacing.md }}>
              <Input
                label="¿Dónde fue? (opcional)"
                value={placeName}
                onChangeText={setPlaceName}
                maxLength={MEMORY_PLACE_MAX}
                placeholder="Ej. La playa de Mazunte"
                error={messages.place}
                editable={!publishing}
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  title="Elegir en el mapa"
                  variant="secondary"
                  icon="pin"
                  disabled={publishing}
                  onPress={() => setPickerOpen(true)}
                />
                {pin || placeName ? (
                  <Button
                    title="Quitar lugar"
                    variant="ghost"
                    disabled={publishing}
                    onPress={() => {
                      setPin(null);
                      setPlaceName('');
                    }}
                  />
                ) : null}
              </View>
              {pin ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Icon name="pin" size={16} color={colors.ink} />
                  <Text variant="note" tone="muted">
                    {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Guardar */}
            <View style={{ gap: spacing.md }}>
              <Button
                title={publishing ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar memoria'}
                onPress={publish}
                loading={publishing}
                fullWidth
              />
              {publishing ? (
                <View
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
                  style={{
                    height: 4,
                    borderRadius: radius.pill,
                    backgroundColor: colors.surface2,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${Math.round(progress * 100)}%`,
                      height: 4,
                      backgroundColor: colors.ink,
                    }}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <PlacePicker
          visible={pickerOpen}
          initial={pin}
          onClose={() => setPickerOpen(false)}
          onConfirm={(point) => {
            setPin(point);
            setPickerOpen(false);
          }}
        />

        <Sheet
          visible={confirmClose}
          onClose={() => setConfirmClose(false)}
          title="¿Salir sin guardar?"
        >
          <View style={{ gap: spacing.lg }}>
            <Text variant="body" tone="muted">
              {editing
                ? 'Los cambios que llevas en esta memoria se pierden.'
                : 'Lo que llevas de esta memoria se pierde.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <Button
                title="Salir"
                variant="danger"
                onPress={() => {
                  setConfirmClose(false);
                  leave();
                }}
              />
              <Button title="Seguir" variant="ghost" onPress={() => setConfirmClose(false)} />
            </View>
          </View>
        </Sheet>
      </Screen>
      {saved ? <ArrivalOverlay text="Memoria guardada" /> : null}
    </View>
  );
}

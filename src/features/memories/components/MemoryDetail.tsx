import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import {
  Button,
  CloudOff,
  EmptyPolaroid,
  EmptyState,
  Icon,
  IconButton,
  LoadingLines,
  Screen,
  Sheet,
  Stamp,
  Text,
} from '@/components';
import { useToast } from '@/components/Toast';
import { useCouple, useToday } from '@/features/couple';
import { errorMessage } from '@/lib/errors';
import { mapsEnabled } from '@/lib/maps';
import { photoCountLabel } from '@/lib/memories';
import { formatStampIsoDate } from '@/lib/stampDate';
import { useTheme } from '@/theme';

import { memoryWhen } from '../ago';
import { useDeleteMemory, useMemory, useMemoryPhotoUrls, useSaveMemoryPhoto } from '../hooks';
import { PhotoCarousel } from './PhotoCarousel';
import { PaperMap } from './PaperMap';
import { LiteMap } from './PlaceMaps';
import { toPoints } from './mapShared';

/** Coordenadas con 4 decimales ("19.4326, -99.1332") para el folio del lugar. */
function coords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/** Detalle de una memoria (`/memory/<id>`): carrusel, fecha, texto, lugar y acciones. */
export function MemoryDetail({ id }: { id: string }) {
  const { spacing, colors, page } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const { today } = useToday();
  const { me, partner } = useCouple();
  const { memory, isLoading, isError, refetch } = useMemory(id);
  const remove = useDeleteMemory();
  const save = useSaveMemoryPhoto();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const paths = useMemo(
    () => (memory ? memory.photos.flatMap((p) => [p.path, p.thumb_path]) : []),
    [memory],
  );
  const { urls } = useMemoryPhotoUrls(paths);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/memories');
  };

  const back = (
    <View style={{ marginLeft: -spacing.sm }}>
      <IconButton name="back" accessibilityLabel="Volver" onPress={leave} />
    </View>
  );

  if (isLoading) {
    return (
      <Screen>
        {back}
        <View style={{ marginTop: spacing.xl }}>
          <LoadingLines count={4} accessibilityLabel="Abriendo la memoria" />
        </View>
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen>
        {back}
        <EmptyState
          illustration={<CloudOff />}
          title="No pudimos abrir la memoria"
          body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
          actionLabel="Reintentar"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }
  if (!memory) {
    return (
      <Screen>
        {back}
        <EmptyState
          illustration={<EmptyPolaroid />}
          title="Esa hoja ya no está"
          body="Quizá la arrancaron desde el otro celular."
          actionLabel="Ir a Memorias"
          onAction={() => router.replace('/memories')}
        />
      </Screen>
    );
  }

  const when = memoryWhen(memory.happened_on, today);
  const author =
    memory.created_by === me?.id
      ? 'ti'
      : memory.created_by === partner?.id
        ? partner.nickname || partner.display_name || 'tu pareja'
        : null;
  const current = memory.photos[Math.min(photoIndex, memory.photos.length - 1)];
  const hasPin = memory.lat != null && memory.lng != null;
  // El carrusel invade el margen hasta 24 dp del borde (DISENO §2.3).
  const bleed = page.contentLeft - 24;
  const carouselWidth = width - 48;

  const download = () => {
    if (!current || save.isPending) return;
    save.mutate(current.path, {
      onSuccess: (result) =>
        toast.show(
          result === 'saved'
            ? { message: 'Listo, la foto ya está en tu galería.', tone: 'success' }
            : {
                message:
                  'Para guardarla necesitamos permiso de fotos. Actívalo en los ajustes del celular.',
                tone: 'error',
              },
        ),
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
    });
  };

  const tear = () => {
    setConfirmDelete(false);
    remove.mutate(memory.id, {
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
    });
    leave();
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>{back}</View>
          <IconButton
            name="pencil"
            accessibilityLabel="Editar la memoria"
            onPress={() => router.push({ pathname: '/memory/edit', params: { id: memory.id } })}
          />
          <IconButton
            name="download"
            accessibilityLabel="Descargar esta foto"
            disabled={save.isPending || !current}
            onPress={download}
          />
          <IconButton
            name="trash"
            accessibilityLabel="Arrancar esta hoja"
            onPress={() => setConfirmDelete(true)}
          />
        </View>

        <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Stamp>{formatStampIsoDate(memory.happened_on)}</Stamp>
            {when ? (
              <Text variant="small" tone="muted">
                {when}
              </Text>
            ) : null}
          </View>
          <Text variant={memory.title.length > 26 ? 'title' : 'display'} accessibilityRole="header">
            {memory.title}
          </Text>
        </View>

        <View style={{ marginLeft: -bleed, paddingTop: spacing.sm }}>
          <PhotoCarousel
            photos={memory.photos}
            urls={urls}
            width={carouselWidth}
            title={memory.title}
            onIndexChange={setPhotoIndex}
          />
        </View>
        {memory.photos.length > 1 ? (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            {photoCountLabel(memory.photos.length)}. Desliza para ver las demás.
          </Text>
        ) : null}

        {memory.body ? <Text variant="body">{memory.body}</Text> : null}

        {memory.place_name || hasPin ? (
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="pin" size={20} color={colors.jamaica} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {memory.place_name ?? 'Un lugar sin nombre'}
              </Text>
            </View>
            {hasPin ? (
              <View style={{ gap: spacing.xs }}>
                {mapsEnabled() ? (
                  <LiteMap
                    point={{ lat: memory.lat as number, lng: memory.lng as number }}
                    height={150}
                  />
                ) : (
                  <PaperMap points={toPoints([memory])} height={150} compact />
                )}
                <Text variant="mono" tone="muted">
                  {coords(memory.lat as number, memory.lng as number)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {author ? (
          <Text variant="small" tone="muted">
            Pegada por {author}.
          </Text>
        ) : null}
      </View>

      <Sheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Arrancar esta hoja?"
      >
        <View style={{ gap: spacing.lg }}>
          <Text variant="body" tone="muted">
            La memoria y sus fotos dejan de verse para los dos. No se puede deshacer.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Button title="Arrancarla" onPress={tear} />
            <Button title="Mejor no" variant="ghost" onPress={() => setConfirmDelete(false)} />
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

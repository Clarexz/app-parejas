import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import {
  Button,
  EmptyState,
  FruitDot,
  Icon,
  IconButton,
  LoadingSymbol,
  Notice,
  Screen,
  Sheet,
  Text,
} from '@/components';
import { useToast } from '@/components/Toast';
import { useCouple, useToday } from '@/features/couple';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { mapsEnabled } from '@/lib/maps';
import { photoCountLabel } from '@/lib/memories';
import { useTheme } from '@/theme';

import { memoryDate, memoryWhen } from '../ago';
import { useAuthorFruit } from '../authorFruit';
import { useDeleteMemory, useMemory, useMemoryPhotoUrls, useSaveMemoryPhoto } from '../hooks';
import { PaperMap } from './PaperMap';
import { PhotoCarousel } from './PhotoCarousel';
import { LiteMap } from './PlaceMaps';
import { toPoints } from './mapShared';

/** Detalle de una memoria (`/memory/<id>`): carrusel, fecha, texto, lugar y acciones. */
export function MemoryDetail({ id }: { id: string }) {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { today } = useToday();
  const { me, partner } = useCouple();
  const fruitOf = useAuthorFruit();
  const { memory, isLoading, isError, refetch } = useMemory(id);
  const remove = useDeleteMemory();
  const save = useSaveMemoryPhoto();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [width, setWidth] = useState(0);

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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSymbol accessibilityLabel="Abriendo la memoria" />
        </View>
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen>
        {back}
        <View style={{ marginTop: spacing.xl }}>
          <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
            No pudimos abrir la memoria. Revisa tu internet y vuelve a intentar.
          </Notice>
        </View>
      </Screen>
    );
  }
  if (!memory) {
    return (
      <Screen>
        {back}
        <EmptyState
          art="symbol"
          title="Esa memoria ya no está"
          body="Quizá la borraron desde el otro celular."
          action={{ label: 'Ir a Memorias', onPress: () => router.replace('/memories') }}
        />
      </Screen>
    );
  }

  const when = memoryWhen(memory.happened_on, today);
  const authorFruit = fruitOf(memory.created_by);
  const authorName =
    memory.created_by === me?.id
      ? 'ti'
      : memory.created_by === partner?.id
        ? partner.nickname || partner.display_name || 'tu pareja'
        : null;
  const current = memory.photos[Math.min(photoIndex, memory.photos.length - 1)];
  const hasPin = memory.lat != null && memory.lng != null;

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

  const confirmRemove = () => {
    haptic.warning();
    setConfirmDelete(true);
  };

  const removeNow = () => {
    setConfirmDelete(false);
    remove.mutate(memory.id, {
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
    });
    leave();
  };

  return (
    <Screen scroll>
      <View
        style={{ gap: spacing.lg }}
        onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}
      >
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
            accessibilityLabel="Borrar esta memoria"
            onPress={confirmRemove}
          />
        </View>

        {width > 0 ? (
          <PhotoCarousel
            photos={memory.photos}
            urls={urls}
            width={width}
            title={memory.title}
            onIndexChange={setPhotoIndex}
          />
        ) : null}

        <View style={{ gap: spacing.xs }}>
          <Text variant="h2" accessibilityRole="header">
            {memory.title}
          </Text>
          <Text variant="note" tone="muted">
            {memoryDate(memory.happened_on)}
            {when ? ` · ${when}` : ''}
            {memory.photos.length > 1 ? ` · ${photoCountLabel(memory.photos.length)}` : ''}
          </Text>
          {memory.visit_id ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Icon name="couple" size={16} color={colors.inkMuted} />
              <Text variant="note" tone="muted">
                Fue una visita: también está en Visitas
              </Text>
            </View>
          ) : null}
        </View>

        {memory.body ? <Text variant="body">{memory.body}</Text> : null}

        {memory.place_name || hasPin ? (
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="pin" size={20} color={colors.ink} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {memory.place_name ?? 'Un lugar sin nombre'}
              </Text>
            </View>
            {hasPin ? (
              mapsEnabled() ? (
                <LiteMap
                  point={{ lat: memory.lat as number, lng: memory.lng as number }}
                  height={160}
                />
              ) : (
                <PaperMap points={toPoints([memory])} height={160} compact />
              )
            ) : null}
          </View>
        ) : null}

        {authorName ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {authorFruit ? <FruitDot fruit={authorFruit} /> : null}
            <Text variant="note" tone="muted">
              Subida por {authorName}.
            </Text>
          </View>
        ) : null}
      </View>

      <Sheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Borrar esta memoria?"
      >
        <View style={{ gap: spacing.lg }}>
          <Text variant="body" tone="muted">
            La memoria y sus fotos dejan de verse para los dos. No se puede deshacer.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Button title="Borrar" variant="danger" onPress={removeNow} />
            <Button title="Mejor no" variant="ghost" onPress={() => setConfirmDelete(false)} />
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

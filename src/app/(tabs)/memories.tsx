import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import {
  EmptyState,
  IconButton,
  LoadingSymbol,
  Notice,
  Screen,
  ScreenHeader,
  Segmented,
  Text,
} from '@/components';
import { MemoriesMap, MemoriesTimeline, toPoints, useMemories } from '@/features/memories';
import { memoryCountLabel } from '@/lib/memories';
import { useTheme } from '@/theme';

type Mode = 'diary' | 'map';

const MODES = [
  { value: 'diary', label: 'Diario' },
  { value: 'map', label: 'Mapa' },
] as const;

export default function MemoriesScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const { memories, isLoading, isError, refetch, isRefetching } = useMemories();
  const [mode, setMode] = useState<Mode>('diary');

  const withoutPlace = useMemo(() => memories.length - toPoints(memories).length, [memories]);
  const open = (id: string) => router.push({ pathname: '/memory/[id]', params: { id } });
  const create = () => router.push('/memory/edit');
  // Con la pestaña vacía la única acción es la del `EmptyState`.
  const empty = !isLoading && !isError && memories.length === 0;

  let body;
  if (isLoading) {
    body = (
      <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl }}>
        <LoadingSymbol accessibilityLabel="Cargando las memorias" />
      </View>
    );
  } else if (isError) {
    body = (
      <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
        No pudimos abrir las memorias. Revisa tu internet y vuelve a intentar.
      </Notice>
    );
  } else if (empty) {
    body = (
      <EmptyState
        art="symbol"
        title="Aquí irá su primera memoria"
        body="¿Cuál sería? Una foto, un lugar y ese día queda guardado para los dos."
        action={{ label: 'Agregar memoria', onPress: create }}
      />
    );
  } else {
    body = (
      <View style={{ gap: spacing.xl }}>
        <View style={{ alignSelf: 'flex-start', minWidth: 240 }}>
          <Segmented
            options={MODES}
            value={mode}
            onChange={setMode}
            accessibilityLabel="Ver memorias como diario o mapa"
          />
        </View>
        {mode === 'diary' ? (
          <MemoriesTimeline memories={memories} onOpen={open} />
        ) : (
          <View style={{ gap: spacing.md }}>
            <MemoriesMap
              memories={memories}
              onOpen={open}
              height={Math.min(Math.round(windowHeight * 0.55), 520)}
            />
            {withoutPlace > 0 ? (
              <Text variant="note" tone="muted" accessibilityLiveRegion="polite">
                {withoutPlace === 1
                  ? '1 memoria sin lugar'
                  : `${memoryCountLabel(withoutPlace)} sin lugar`}
                . Ponles un lugar al editarlas y aparecen aquí.
              </Text>
            ) : null}
          </View>
        )}
      </View>
    );
  }

  return (
    <Screen
      scroll
      refreshing={isRefetching}
      // En el mapa, jalar hacia abajo mueve el mapa, no refresca.
      onRefresh={mode === 'diary' ? () => void refetch() : undefined}
    >
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          title="Memorias"
          right={
            empty || isLoading || isError ? undefined : (
              <IconButton
                name="plus"
                variant="filled"
                accessibilityLabel="Agregar memoria"
                onPress={create}
              />
            )
          }
        />
        {body}
      </View>
    </Screen>
  );
}

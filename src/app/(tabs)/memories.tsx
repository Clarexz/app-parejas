import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { RefreshControl, View, useWindowDimensions } from 'react-native';

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
import {
  MemoriesMap,
  MemoriesTimeline,
  toPoints,
  useMemories,
  type Memory,
} from '@/features/memories';
import { VisitsSummary } from '@/features/visits';
import { memoryCountLabel } from '@/lib/memories';
import { useTheme } from '@/theme';

type Mode = 'diary' | 'map';

const NO_MEMORIES: Memory[] = [];

const MODES = [
  { value: 'diary', label: 'Diario' },
  { value: 'map', label: 'Mapa' },
] as const;

export default function MemoriesScreen() {
  const { spacing, colors, fruit } = useTheme();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const { memories, isLoading, isError, refetch, isRefetching } = useMemories();
  const [mode, setMode] = useState<Mode>('diary');

  const withoutPlace = useMemo(() => memories.length - toPoints(memories).length, [memories]);
  const open = (id: string) => router.push({ pathname: '/memory/[id]', params: { id } });
  const create = () => router.push('/memory/edit');
  // Con la pestaña vacía la única acción es la del `EmptyState`.
  const empty = !isLoading && !isError && memories.length === 0;

  // Segmentos de la lista: cabecera fija arriba; el diario son las filas y todo lo demás
  // (carga, error, vacío, mapa) va de pie de lista. Una sola lista evita remontar al cambiar de modo.
  let footer: ReactNode = null;
  if (isLoading) {
    footer = (
      <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl }}>
        <LoadingSymbol accessibilityLabel="Cargando las memorias" />
      </View>
    );
  } else if (isError) {
    footer = (
      <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
        No pudimos abrir las memorias. Revisa tu internet y vuelve a intentar.
      </Notice>
    );
  } else if (empty) {
    footer = (
      <EmptyState
        art="symbol"
        title="Aquí irá su primera memoria"
        body="¿Cuál sería? Una foto, un lugar y ese día queda guardado para los dos."
        action={{ label: 'Agregar memoria', onPress: create }}
      />
    );
  } else if (mode === 'map') {
    footer = (
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
    );
  }

  const loaded = !isLoading && !isError && !empty;

  const header = (
    <>
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
      <VisitsSummary />
      {loaded ? (
        <Segmented
          options={MODES}
          value={mode}
          onChange={setMode}
          accessibilityLabel="Ver memorias como diario o mapa"
        />
      ) : null}
    </>
  );

  return (
    <Screen>
      <MemoriesTimeline
        // Sin diario visible no hay filas: la lista solo pinta cabecera y pie.
        memories={loaded && mode === 'diary' ? memories : NO_MEMORIES}
        onOpen={open}
        header={header}
        footer={footer}
        // En el mapa, jalar hacia abajo mueve el mapa, no refresca.
        refreshControl={
          mode === 'diary' ? (
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={fruit.me.hex}
              colors={[fruit.me.hex]}
              progressBackgroundColor={colors.surface}
            />
          ) : undefined
        }
      />
    </Screen>
  );
}

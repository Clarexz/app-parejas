import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import {
  Button,
  Chip,
  CloudOff,
  EmptyPolaroid,
  EmptyState,
  LoadingLines,
  PageHeader,
  Screen,
  Text,
} from '@/components';
import { useToday } from '@/features/couple';
import { MemoriesMap, MemoriesTimeline, toPoints, useMemories } from '@/features/memories';
import { memoryCountLabel } from '@/lib/memories';
import { formatStampIsoDate } from '@/lib/stampDate';
import { useTheme } from '@/theme';

type Mode = 'diary' | 'map';

export default function MemoriesScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const { today } = useToday();
  const { memories, isLoading, isError, refetch, isRefetching } = useMemories();
  const [mode, setMode] = useState<Mode>('diary');

  const withoutPlace = useMemo(() => memories.length - toPoints(memories).length, [memories]);
  const open = (id: string) => router.push({ pathname: '/memory/[id]', params: { id } });
  const create = () => router.push('/memory/edit');

  const cta = (
    <View style={{ alignItems: 'flex-start' }}>
      <Button title="Pegar una memoria" onPress={create} />
    </View>
  );

  let body;
  if (isLoading) {
    body = <LoadingLines count={4} accessibilityLabel="Cargando las memorias" />;
  } else if (isError) {
    body = (
      <EmptyState
        illustration={<CloudOff />}
        title="No pudimos abrir las memorias"
        body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
        actionLabel="Reintentar"
        onAction={() => void refetch()}
      />
    );
  } else if (memories.length === 0) {
    body = (
      <View style={{ gap: spacing.md }}>
        <EmptyState
          illustration={<EmptyPolaroid />}
          title="Su diario de fotos"
          body="Todavía no pegan ninguna foto. La primera siempre sale chueca, y está bien."
        />
        {cta}
      </View>
    );
  } else {
    body = (
      <View style={{ gap: spacing.xl }}>
        {cta}
        <View style={{ flexDirection: 'row', gap: spacing.sm }} accessibilityRole="tablist">
          <Chip
            label="Diario"
            color="yellow"
            selected={mode === 'diary'}
            onPress={() => setMode('diary')}
          />
          <Chip
            label="Mapa"
            color="mint"
            selected={mode === 'map'}
            onPress={() => setMode('map')}
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
              <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
                {withoutPlace === 1
                  ? '1 memoria sin lugar'
                  : `${memoryCountLabel(withoutPlace)} sin lugar`}
                . Ponles un pin al editarlas y aparecen aquí.
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
      <PageHeader stamp={formatStampIsoDate(today)} title="Memorias" />
      <View style={{ marginTop: spacing.xl }}>{body}</View>
    </Screen>
  );
}

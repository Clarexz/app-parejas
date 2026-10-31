import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Card,
  CloudOff,
  EmptyState,
  IconButton,
  LoadingLines,
  PageHeader,
  PencilNote,
  Screen,
  Text,
} from '@/components';
import { listKindLabel, progressLabel, progressRatio } from '@/lib/lists';
import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

import type { List } from '../api';
import { useLists, useListsRealtime } from '../hooks';
import { ListEditorSheet } from './ListEditorSheet';

/** Línea de avance dibujada como un renglón de tinta (Nopal al completarse). */
function ProgressLine({ done, total }: { done: number; total: number }) {
  const { colors } = useTheme();
  const ratio = progressRatio(done, total);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: 3, backgroundColor: colors.ruled }}
    >
      <View
        style={{
          height: 3,
          width: `${Math.round(ratio * 100)}%`,
          backgroundColor: ratio >= 1 ? colors.nopal : colors.ink,
        }}
      />
    </View>
  );
}

function ListCard({ list, onPress }: { list: List; onPress: () => void }) {
  const { spacing } = useTheme();
  const kind = listKindLabel(list.kind);
  const progress = progressLabel(list.doneCount, list.itemCount);
  return (
    <Card
      tilt={tiltFor(list.id, 1)}
      onPress={onPress}
      accessibilityLabel={`${list.title}, ${kind}, ${progress}`}
    >
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {list.emoji ? <Text variant="title">{list.emoji}</Text> : null}
          <Text variant="title" style={{ flex: 1 }} numberOfLines={2}>
            {list.title}
          </Text>
        </View>
        <Text variant="small" tone="muted">
          {kind} · {progress}
        </Text>
        {list.itemCount > 0 ? <ProgressLine done={list.doneCount} total={list.itemCount} /> : null}
      </View>
    </Card>
  );
}

/** Pantalla "Listas" (`/lists`): fichas apiladas con su avance y la hoja para crear una. */
export function ListsView() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { lists, isLoading, isError, refetch, isRefetching } = useLists();
  const [creating, setCreating] = useState(false);
  useListsRealtime();

  const open = (id: string) => router.push({ pathname: '/lists/[id]', params: { id } });
  const create = () => setCreating(true);

  let body;
  if (isLoading) {
    body = <LoadingLines count={4} accessibilityLabel="Cargando las listas" />;
  } else if (isError) {
    body = (
      <EmptyState
        illustration={<CloudOff />}
        title="No pudimos abrir las listas"
        body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
        actionLabel="Reintentar"
        onAction={() => void refetch()}
      />
    );
  } else if (lists.length === 0) {
    body = (
      <EmptyState
        illustration={<PencilNote />}
        title="Aquí todavía no hay nada apuntado"
        body="El súper, los lugares que quieren conocer, las series que siempre dejan para después. Lo que no quieren que se les olvide, mejor en una lista."
        actionLabel="Crear una lista"
        onAction={create}
      />
    );
  } else {
    body = (
      <View style={{ gap: spacing.lg }}>
        {lists.map((list) => (
          <ListCard key={list.id} list={list} onPress={() => open(list.id)} />
        ))}
      </View>
    );
  }

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View style={{ gap: spacing.xl }}>
        <View style={{ marginLeft: -spacing.sm, alignItems: 'flex-start' }}>
          <IconButton
            name="back"
            accessibilityLabel="Volver"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/more'))}
          />
        </View>
        <PageHeader
          stamp={
            lists.length > 0
              ? `${lists.length} ${lists.length === 1 ? 'LISTA' : 'LISTAS'}`
              : 'LISTAS'
          }
          title="Listas"
          right={
            <IconButton
              name="plus"
              variant="sticker"
              accessibilityLabel="Nueva lista"
              onPress={create}
            />
          }
        />
        {body}
      </View>
      <ListEditorSheet visible={creating} onClose={() => setCreating(false)} onSaved={open} />
    </Screen>
  );
}

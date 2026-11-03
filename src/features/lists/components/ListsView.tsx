import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Card,
  EmptyState,
  Icon,
  IconButton,
  LoadingSymbol,
  Notice,
  Screen,
  ScreenHeader,
  Text,
  type IconName,
} from '@/components';
import { listKindLabel, progressLabel, progressRatio } from '@/lib/lists';
import { useTheme } from '@/theme';

import type { List } from '../api';
import { useLists, useListsRealtime } from '../hooks';
import { ListEditorSheet } from './ListEditorSheet';

/** Ícono del set por tipo de lista. */
export const LIST_KIND_ICON: Record<string, IconName> = {
  trip: 'suitcase',
  groceries: 'lists',
  bucket: 'spark',
  watch: 'eye',
  places: 'map',
  other: 'list',
};

/** Barra de avance en `ink` (la fruta solo dice quién es quién). */
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const { colors } = useTheme();
  const ratio = progressRatio(done, total);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' }}
    >
      <View
        style={{
          height: 6,
          borderRadius: 3,
          width: `${Math.round(ratio * 100)}%`,
          backgroundColor: colors.ink,
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
    <Card onPress={onPress} accessibilityLabel={`${list.title}, ${kind}, ${progress}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ width: 32, alignItems: 'center' }}>
          {list.emoji ? (
            <Text variant="h3">{list.emoji}</Text>
          ) : (
            <Icon name={LIST_KIND_ICON[list.kind] ?? 'list'} size={28} />
          )}
        </View>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="h3" numberOfLines={2}>
            {list.title}
          </Text>
          <Text variant="note" tone="muted">
            {kind} · {progress}
          </Text>
        </View>
        <Icon name="chevron" size={20} />
      </View>
      {list.itemCount > 0 ? <ProgressBar done={list.doneCount} total={list.itemCount} /> : null}
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
    body = (
      <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
        <LoadingSymbol accessibilityLabel="Cargando las listas" />
      </View>
    );
  } else if (isError) {
    body = (
      <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
        No pudimos abrir las listas. Revisa tu señal e intenta otra vez.
      </Notice>
    );
  } else if (lists.length === 0) {
    body = (
      <EmptyState
        art="spark"
        title="Aquí irá su primera lista"
        body="El súper, los lugares que quieren conocer, las series que siempre dejan para después."
        action={{ label: 'Crear una lista', onPress: create }}
      />
    );
  } else {
    body = (
      <View style={{ gap: spacing.md }}>
        {lists.map((list) => (
          <ListCard key={list.id} list={list} onPress={() => open(list.id)} />
        ))}
      </View>
    );
  }

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          back
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/more'))}
          label={
            lists.length > 0
              ? `${lists.length} ${lists.length === 1 ? 'lista' : 'listas'}`
              : undefined
          }
          title="Listas"
          right={
            <IconButton
              name="plus"
              variant="filled"
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

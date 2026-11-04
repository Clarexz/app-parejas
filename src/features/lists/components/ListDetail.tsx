import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import {
  Button,
  EmptyState,
  IconButton,
  Input,
  LoadingSymbol,
  Notice,
  Screen,
  ScreenHeader,
  Sheet,
  Text,
} from '@/components';
import { useToast } from '@/components/Toast';
import { useCouple, useFruits } from '@/features/couple';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import {
  LIST_ITEMS_MAX,
  LIST_ITEM_MAX,
  isTempId,
  listItemError,
  listKindLabel,
  progressLabel,
  reorderedIds,
  splitItems,
} from '@/lib/lists';
import { useTheme } from '@/theme';

import {
  useAddListItem,
  useClearDoneListItems,
  useDeleteList,
  useDeleteListItem,
  useList,
  useListItems,
  useListsRealtime,
  useReorderListItems,
  useToggleListItem,
  useUpdateListItem,
} from '../hooks';
import { ListEditorSheet } from './ListEditorSheet';
import { ListItemRow } from './ListItemRow';
import { ProgressBar } from './ListsView';

/** Una lista (`/lists/<id>`): renglones con casilla, agregar seguidos, acomodar y limpiar tachados. */
export function ListDetail({ id }: { id: string }) {
  const { spacing, colors } = useTheme();
  const fruits = useFruits();
  const router = useRouter();
  const toast = useToast();
  const { me, partner } = useCouple();
  const { list, isLoading, isError, refetch } = useList(id);
  const items = useListItems(id);
  const add = useAddListItem();
  const toggle = useToggleListItem();
  const update = useUpdateListItem();
  const removeItem = useDeleteListItem();
  const clear = useClearDoneListItems();
  const reorder = useReorderListItems();
  const removeList = useDeleteList();
  useListsRealtime();

  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [arranging, setArranging] = useState(false);
  const [editingList, setEditingList] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const partnerName = partner?.nickname || partner?.display_name || null;
  const fail = (e: unknown) => toast.show({ message: errorMessage(e), tone: 'error' });

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/lists');
  };

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader back="Listas" onBack={leave} title="Lista" />
        <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
          <LoadingSymbol accessibilityLabel="Abriendo la lista" />
        </View>
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen>
        <ScreenHeader back="Listas" onBack={leave} title="Lista" />
        <View style={{ marginTop: spacing.xl }}>
          <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
            No pudimos abrir la lista. Revisa tu señal e intenta otra vez.
          </Notice>
        </View>
      </Screen>
    );
  }
  if (!list) {
    return (
      <Screen>
        <ScreenHeader back="Listas" onBack={leave} title="Lista" />
        <EmptyState
          art="symbol"
          title="Esa lista ya no está"
          body="Quizá la borraron desde el otro celular."
          action={{ label: 'Ir a Listas', onPress: () => router.replace('/lists') }}
        />
      </Screen>
    );
  }

  const { pending, done } = splitItems(items.items);
  const total = items.items.length;
  const hasTemp = items.items.some((i) => isTempId(i.id));
  const full = total >= LIST_ITEMS_MAX;
  const progress = progressLabel(done.length, total);

  const submit = () => {
    const error = listItemError(draft);
    if (error) return; // renglón vacío: no hace nada, el input sigue abierto
    if (full) {
      toast.show({ message: `Una lista guarda hasta ${LIST_ITEMS_MAX} renglones.`, tone: 'info' });
      return;
    }
    const text = draft;
    setDraft('');
    add.mutate({ listId: id, text }, { onError: fail });
  };

  const toggleItem = (itemId: string, next: boolean) => {
    if (next) haptic.light();
    toggle.mutate({ listId: id, id: itemId, done: next }, { onError: fail });
  };

  const move = (from: number, to: number) => {
    if (hasTemp) return;
    reorder.mutate({ listId: id, ids: reorderedIds(items.items, from, to) }, { onError: fail });
  };

  const clearDone = () => {
    clear.mutate(id, {
      onSuccess: (count) =>
        toast.show({
          message:
            count === 1
              ? 'Listo, se fue 1 renglón tachado.'
              : `Listo, se fueron ${count} tachados.`,
          tone: 'success',
        }),
      onError: fail,
    });
  };

  const tear = () => {
    setConfirmDelete(false);
    removeList.mutate(id, { onError: fail });
    leave();
  };

  const rowFor = (item: (typeof pending)[number], index: number, arrangeable: boolean) => (
    <ListItemRow
      key={item.id}
      item={item}
      meId={me?.id ?? null}
      partnerName={partnerName}
      pending={isTempId(item.id)}
      editing={editingId === item.id}
      arranging={arranging}
      canMoveUp={arrangeable && !hasTemp && index > 0}
      canMoveDown={arrangeable && !hasTemp && index < pending.length - 1}
      onToggle={() => toggleItem(item.id, !item.done)}
      onStartEdit={() => setEditingId(item.id)}
      onCancelEdit={() => setEditingId(null)}
      onSaveText={(text) => {
        setEditingId(null);
        update.mutate({ listId: id, id: item.id, text }, { onError: fail });
      }}
      onDelete={() => {
        setEditingId(null);
        removeItem.mutate({ listId: id, id: item.id }, { onError: fail });
      }}
      onMoveUp={() => move(index, index - 1)}
      onMoveDown={() => move(index, index + 1)}
    />
  );

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          refreshControl={
            <RefreshControl
              refreshing={items.isRefetching}
              onRefresh={() => {
                void refetch();
                void items.refetch();
              }}
              tintColor={fruits.me.hex}
              colors={[fruits.me.hex]}
              progressBackgroundColor={colors.surface}
            />
          }
        >
          <View style={{ gap: spacing.lg }}>
            <ScreenHeader
              back="Listas"
              onBack={leave}
              label={`${listKindLabel(list.kind)} · ${progress}`}
              title={list.emoji ? `${list.emoji} ${list.title}` : list.title}
              right={
                <View style={{ flexDirection: 'row' }}>
                  {pending.length > 1 ? (
                    <IconButton
                      name="list"
                      accessibilityLabel={
                        arranging ? 'Terminar de acomodar' : 'Acomodar los renglones'
                      }
                      onPress={() => {
                        setEditingId(null);
                        setArranging((v) => !v);
                      }}
                    />
                  ) : null}
                  <IconButton
                    name="pencil"
                    accessibilityLabel="Editar la lista"
                    onPress={() => setEditingList(true)}
                  />
                  <IconButton
                    name="trash"
                    accessibilityLabel="Borrar esta lista"
                    onPress={() => setConfirmDelete(true)}
                  />
                </View>
              }
            />
            {total > 0 ? <ProgressBar done={done.length} total={total} /> : null}

            {arranging ? (
              <Text variant="note" tone="muted">
                Usa las flechas para subir o bajar cada renglón. Los tachados se quedan abajo.
              </Text>
            ) : null}

            {items.isLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                <LoadingSymbol accessibilityLabel="Cargando los renglones" />
              </View>
            ) : items.isError ? (
              <Notice
                tone="danger"
                action={{ label: 'Reintentar', onPress: () => void items.refetch() }}
              >
                No pudimos traer los renglones. Revisa tu señal e intenta otra vez.
              </Notice>
            ) : total === 0 ? (
              <EmptyState
                art="spark"
                title="Aquí va el primer renglón"
                body="Escríbelo abajo. Con enter agregas otro."
              />
            ) : (
              <View>
                {pending.map((item, index) => rowFor(item, index, true))}
                {done.length > 0 ? (
                  <View style={{ marginTop: spacing.xl, gap: spacing.xs }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text variant="h3">
                        Tachados{' '}
                        <Text variant="note" tone="muted">
                          {done.length}
                        </Text>
                      </Text>
                      <Button
                        title="Quitar los tachados"
                        variant="ghost"
                        size="sm"
                        onPress={clearDone}
                        loading={clear.isPending}
                      />
                    </View>
                    {done.map((item, index) => rowFor(item, index, false))}
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </ScrollView>

        {!arranging ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingTop: spacing.sm,
            }}
          >
            <View style={{ flex: 1 }}>
              <Input
                value={draft}
                onChangeText={setDraft}
                maxLength={LIST_ITEM_MAX}
                placeholder="Agregar un renglón"
                accessibilityLabel="Agregar un renglón"
                returnKeyType="send"
                submitBehavior="submit"
                onSubmitEditing={submit}
              />
            </View>
            <IconButton
              name="send"
              variant="filled"
              accessibilityLabel="Agregar el renglón"
              disabled={draft.trim().length === 0}
              onPress={submit}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <ListEditorSheet visible={editingList} onClose={() => setEditingList(false)} list={list} />

      <Sheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Borrar esta lista?"
      >
        <View style={{ gap: spacing.lg }}>
          <Text variant="body" tone="muted">
            La lista y todos sus renglones dejan de verse para los dos. No se puede deshacer.
          </Text>
          <View style={{ gap: spacing.sm }}>
            <Button title="Borrar" variant="danger" onPress={tear} fullWidth />
            <Button
              title="Mejor no"
              variant="ghost"
              onPress={() => setConfirmDelete(false)}
              fullWidth
            />
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

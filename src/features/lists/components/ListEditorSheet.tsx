import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Input, Sheet, Text } from '@/components';
import { errorMessage } from '@/lib/errors';
import {
  LIST_EMOJI_MAX,
  LIST_KINDS,
  LIST_TITLE_MAX,
  listKindInfo,
  listTitleError,
  type ListKind,
} from '@/lib/lists';
import { useTheme } from '@/theme';

import type { List } from '../api';
import { useSaveList } from '../hooks';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Con lista se edita; sin ella se crea. */
  list?: List | null;
  onSaved?: (id: string) => void;
};

/** Hoja para crear o editar una lista: título, tipo (chips de cinta) y emoji opcional. */
export function ListEditorSheet({ visible, onClose, list, onSaved }: Props) {
  const { spacing } = useTheme();
  const save = useSaveList();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ListKind>('other');
  const [emoji, setEmoji] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada vez que se abre, el formulario arranca con la lista (o en blanco): estado derivado.
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setTitle(list?.title ?? '');
      setKind((list?.kind as ListKind | undefined) ?? 'other');
      setEmoji(list?.emoji ?? '');
      setTouched(false);
      setError(null);
    }
  }

  const titleError = touched ? listTitleError(title) : null;
  const editing = !!list;

  const submit = () => {
    setTouched(true);
    if (listTitleError(title) || save.isPending) return;
    setError(null);
    save.mutate(
      { id: list?.id, title, kind, emoji },
      {
        onSuccess: (saved) => {
          onClose();
          onSaved?.(saved.id);
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Editar la lista' : 'Una lista nueva'}
    >
      <View style={{ gap: spacing.lg }}>
        <Input
          label="¿Cómo se llama?"
          value={title}
          onChangeText={setTitle}
          maxLength={LIST_TITLE_MAX}
          placeholder={listKindInfo(kind).placeholder}
          error={titleError ?? undefined}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <View style={{ gap: spacing.sm }}>
          <Text variant="hand" tone="muted">
            ¿De qué es?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {LIST_KINDS.map((k, i) => (
              <Chip
                key={k.kind}
                label={k.label}
                color={i % 2 === 0 ? 'yellow' : 'mint'}
                selected={kind === k.kind}
                onPress={() => setKind(k.kind)}
              />
            ))}
          </View>
        </View>
        <Input
          label="Un emoji, si quieren (opcional)"
          value={emoji}
          onChangeText={setEmoji}
          maxLength={LIST_EMOJI_MAX}
          placeholder="🛒"
        />
        {error ? (
          <Text variant="small" tone="chile" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Button
            title={editing ? 'Guardar cambios' : 'Crear la lista'}
            onPress={submit}
            loading={save.isPending}
          />
          <Button title="Mejor no" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Sheet>
  );
}

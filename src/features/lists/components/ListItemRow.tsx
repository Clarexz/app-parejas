import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Checkbox, Icon, IconButton, Input, Text } from '@/components';
import { LIST_ITEM_MAX, doneByLabel, listItemError } from '@/lib/lists';
import { useTheme } from '@/theme';

import type { ListItem } from '../api';

type Props = {
  item: ListItem;
  meId: string | null;
  partnerName: string | null;
  /** Renglón aún sin confirmar por el servidor: no se puede tocar. */
  pending: boolean;
  editing: boolean;
  /** Modo "Acomodar": se muestran las flechas subir/bajar. */
  arranging: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveText: (text: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

/** Flecha de "Acomodar": la flecha `back` del set girada (no hay icono de subir/bajar). */
function ArrowButton({
  direction,
  label,
  disabled,
  onPress,
}: {
  direction: 'up' | 'down';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <View style={{ transform: [{ rotate: direction === 'up' ? '90deg' : '-90deg' }] }}>
        <Icon name="back" size={24} color={colors.ink} />
      </View>
    </Pressable>
  );
}

/** Un renglón de la lista: casilla, texto (tocarlo lo edita), quién lo tachó y, al acomodar, flechas. */
export function ListItemRow({
  item,
  meId,
  partnerName,
  pending,
  editing,
  arranging,
  canMoveUp,
  canMoveDown,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSaveText,
  onDelete,
  onMoveUp,
  onMoveDown,
}: Props) {
  const { colors, spacing } = useTheme();
  const [draft, setDraft] = useState(item.text);
  const [touched, setTouched] = useState(false);
  const error = touched ? listItemError(draft) : null;
  const by = doneByLabel(item, meId, partnerName);

  const rule = {
    borderBottomWidth: 1,
    borderBottomColor: colors.ruled,
  } as const;

  if (editing) {
    const save = () => {
      setTouched(true);
      if (listItemError(draft)) return;
      onSaveText(draft);
    };
    return (
      <View style={[{ gap: spacing.sm, paddingVertical: spacing.md }, rule]}>
        <Input
          value={draft}
          onChangeText={setDraft}
          maxLength={LIST_ITEM_MAX}
          autoFocus
          accessibilityLabel="Texto del renglón"
          error={error ?? undefined}
          returnKeyType="done"
          onSubmitEditing={save}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Button title="Guardar" onPress={save} />
          <Button title="Cancelar" variant="ghost" onPress={onCancelEdit} />
          <View style={{ flex: 1 }} />
          <IconButton name="trash" accessibilityLabel="Borrar este renglón" onPress={onDelete} />
        </View>
      </View>
    );
  }

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, rule]}>
      <Checkbox
        checked={item.done}
        disabled={pending || arranging}
        onPress={onToggle}
        accessibilityLabel={item.done ? `Destachar: ${item.text}` : `Tachar: ${item.text}`}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar: ${item.text}`}
        disabled={pending || arranging}
        onPress={onStartEdit}
        style={{ flex: 1, paddingVertical: spacing.sm, minHeight: 44, justifyContent: 'center' }}
      >
        <Text
          variant="body"
          tone={item.done ? 'muted' : 'ink'}
          style={item.done ? { textDecorationLine: 'line-through' } : undefined}
        >
          {item.text}
        </Text>
        {by ? (
          <Text variant="caption" tone="muted">
            {by}
          </Text>
        ) : null}
      </Pressable>
      {arranging && !item.done ? (
        <View style={{ flexDirection: 'row' }}>
          <ArrowButton
            direction="up"
            label={`Subir: ${item.text}`}
            disabled={!canMoveUp}
            onPress={onMoveUp}
          />
          <ArrowButton
            direction="down"
            label={`Bajar: ${item.text}`}
            disabled={!canMoveDown}
            onPress={onMoveDown}
          />
        </View>
      ) : null}
    </View>
  );
}

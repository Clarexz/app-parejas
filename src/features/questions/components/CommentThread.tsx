import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Chip,
  FruitDot,
  IconButton,
  Input,
  ListRow,
  LoadingSymbol,
  Notice,
  Sheet,
  Text,
} from '@/components';
import { useToast } from '@/components/Toast';
import { formatTimeIn } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { commentCountLabel } from '@/lib/questionCopy';
import {
  COMMENT_MAX_LENGTH,
  REACTION_OPTIONS,
  reactionSummary,
  validateComment,
} from '@/lib/questions';
import { useTheme } from '@/theme';

import type { Comment } from '../api';
import { useAddComment, useComments, useDeleteComment, useReactToComment } from '../hooks';
import { usePairFruits } from './usePairFruits';

const isOptimistic = (c: Comment) => c.id.startsWith('optimistic-');

type ListProps = {
  questionId: string;
  myId: string | null;
  partnerName: string;
  timeZone: string;
  /** Para el encabezado mientras cargan los comentarios. */
  commentCount?: number;
};

/** Comentarios en burbujas `surface` (radio 18) con el `FruitDot` de quien los escribió. */
export function CommentList({ questionId, myId, partnerName, timeZone, commentCount }: ListProps) {
  const { colors, spacing, radius, fruit } = useTheme();
  const fruits = usePairFruits();
  const toast = useToast();
  const { comments, isLoading, isError, refetch } = useComments(questionId);
  const react = useReactToComment();
  const del = useDeleteComment();
  // El comentario abierto vive en estado: la hoja sigue pintándose mientras se cierra.
  const [menu, setMenu] = useState<{ comment: Comment; open: boolean } | null>(null);
  const openMenu = (comment: Comment) => setMenu({ comment, open: true });
  const closeMenu = () => setMenu((m) => (m ? { ...m, open: false } : m));
  const menuComment = menu
    ? (comments.find((c) => c.id === menu.comment.id) ?? menu.comment)
    : null;

  const reactTo = (comment: Comment, emoji: string | null) => {
    react.mutate(
      { commentId: comment.id, questionId, emoji },
      { onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }) },
    );
  };
  const remove = (comment: Comment) => {
    closeMenu();
    del.mutate(
      { commentId: comment.id, questionId },
      { onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }) },
    );
  };

  const total = isLoading ? (commentCount ?? 0) : comments.length;

  return (
    <View style={{ gap: spacing.lg }}>
      <Text variant="label" tone="muted" accessibilityRole="header">
        {commentCountLabel(total)}
      </Text>

      {isLoading ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <LoadingSymbol size={32} accessibilityLabel="Cargando los comentarios" />
        </View>
      ) : isError ? (
        <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
          No pudimos traer los comentarios. Revisa tu internet y vuelve a intentar.
        </Notice>
      ) : comments.length === 0 ? (
        <Text variant="body" tone="muted">
          Nadie ha dicho nada todavía. Empiecen ustedes.
        </Text>
      ) : (
        comments.map((c) => {
          const mine = c.user_id === myId;
          const summary = reactionSummary(c.reactions, myId ?? '');
          const time = formatTimeIn(timeZone, new Date(c.created_at));
          return (
            <View key={c.id} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ paddingTop: 18 }}>
                <FruitDot fruit={mine ? fruits.me : fruits.partner} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-start', gap: spacing.xs }}>
                <Pressable
                  disabled={isOptimistic(c)}
                  onLongPress={() => {
                    haptic.light();
                    openMenu(c);
                  }}
                  delayLongPress={350}
                  accessibilityLabel={`${mine ? 'Tú' : partnerName}, ${time}: ${c.body}`}
                  accessibilityHint="Mantén pulsado para reaccionar"
                  accessibilityActions={[{ name: 'activate', label: 'Reaccionar' }]}
                  onAccessibilityAction={() => openMenu(c)}
                  style={{ maxWidth: '92%' }}
                >
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: radius.md,
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.lg,
                      opacity: isOptimistic(c) ? 0.7 : 1,
                    }}
                  >
                    <Text variant="body">{c.body}</Text>
                  </View>
                </Pressable>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                  }}
                >
                  <Text variant="note" tone="muted">
                    {mine ? time : `${partnerName} · ${time}`}
                  </Text>
                  {summary.map((r) => (
                    <Chip
                      key={r.emoji}
                      label={r.count > 1 ? `${r.emoji} ${r.count}` : r.emoji}
                      selected={r.mine}
                      disabled={isOptimistic(c)}
                      onPress={() => reactTo(c, r.mine ? null : r.emoji)}
                    />
                  ))}
                </View>
              </View>
            </View>
          );
        })
      )}

      <Sheet visible={!!menu?.open} onClose={closeMenu} title="Reaccionar">
        {menuComment ? (
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {REACTION_OPTIONS.map((emoji) => {
                const current = reactionSummary(menuComment.reactions, myId ?? '').find(
                  (r) => r.mine,
                )?.emoji;
                const selected = current === emoji;
                return (
                  <Pressable
                    key={emoji}
                    onPress={() => {
                      haptic.light();
                      reactTo(menuComment, selected ? null : emoji);
                      closeMenu();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Reaccionar con ${emoji}`}
                    accessibilityState={{ selected }}
                    style={{
                      width: 52,
                      height: 52,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: radius.pill,
                      borderWidth: 2,
                      borderColor: selected ? fruit.me.hex : 'transparent',
                      backgroundColor: colors.surface2,
                    }}
                  >
                    <Text variant="h3">{emoji}</Text>
                  </Pressable>
                );
              })}
            </View>
            {menuComment.user_id === myId ? (
              <ListRow
                label="Borrar este comentario"
                icon="trash"
                tone="danger"
                divider={false}
                onPress={() => remove(menuComment)}
              />
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

type ComposerProps = { questionId: string; onSent?: () => void };

/** Input de una línea fijo abajo para comentar. */
export function CommentComposer({ questionId, onSent }: ComposerProps) {
  const { spacing } = useTheme();
  const toast = useToast();
  const add = useAddComment();
  const [body, setBody] = useState('');
  const valid = validateComment(body).ok;

  const send = () => {
    if (!valid || add.isPending) return;
    const text = body;
    setBody('');
    onSent?.();
    add.mutate(
      { questionId, body: text },
      {
        onError: (e) => {
          setBody(text);
          toast.show({ message: errorMessage(e), tone: 'danger' });
        },
      },
    );
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View style={{ flex: 1 }}>
        <Input
          value={body}
          onChangeText={setBody}
          placeholder="Escribe un comentario"
          accessibilityLabel="Escribe un comentario"
          maxLength={COMMENT_MAX_LENGTH}
          returnKeyType="send"
          submitBehavior="submit"
          onSubmitEditing={send}
        />
      </View>
      <IconButton
        name="send"
        variant="filled"
        accessibilityLabel="Enviar comentario"
        disabled={!valid}
        onPress={send}
      />
    </View>
  );
}

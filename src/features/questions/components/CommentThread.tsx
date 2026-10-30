import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Button,
  Divider,
  IconButton,
  Input,
  ListRow,
  LoadingLines,
  Sheet,
  Text,
} from '@/components';
import { useToast } from '@/components/Toast';
import { formatTimeIn } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import {
  COMMENT_MAX_LENGTH,
  REACTION_OPTIONS,
  reactionSummary,
  validateComment,
} from '@/lib/questions';
import { useTheme } from '@/theme';

import type { Comment } from '../api';
import { useAddComment, useComments, useDeleteComment, useReactToComment } from '../hooks';

const isOptimistic = (c: Comment) => c.id.startsWith('optimistic-');

type ListProps = {
  questionId: string;
  myId: string | null;
  partnerName: string;
  timeZone: string;
};

/** Hilo de comentarios: notitas mías a la derecha, de tu pareja a la izquierda (DISENO §8). */
export function CommentList({ questionId, myId, partnerName, timeZone }: ListProps) {
  const { colors, spacing, shadows } = useTheme();
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
      { onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }) },
    );
  };
  const remove = (comment: Comment) => {
    closeMenu();
    del.mutate(
      { commentId: comment.id, questionId },
      { onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }) },
    );
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="title" accessibilityRole="header">
          Lo que se dijeron
        </Text>
        <Divider />
      </View>

      {isLoading ? (
        <LoadingLines count={2} accessibilityLabel="Cargando los comentarios" />
      ) : isError ? (
        <View style={{ gap: spacing.xs }}>
          <Text variant="body" tone="muted">
            No pudimos traer los comentarios. Revisa tu internet y vuelve a intentar.
          </Text>
          <Button title="Reintentar" variant="ghost" onPress={() => void refetch()} />
        </View>
      ) : comments.length === 0 ? (
        <Text variant="hand" tone="muted">
          Nadie ha dicho nada todavía. Empiecen ustedes.
        </Text>
      ) : (
        comments.map((c) => {
          const mine = c.user_id === myId;
          const summary = reactionSummary(c.reactions, myId ?? '');
          const time = formatTimeIn(timeZone, new Date(c.created_at));
          return (
            <View
              key={c.id}
              style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: spacing.xs }}
            >
              <Pressable
                disabled={isOptimistic(c)}
                onLongPress={() => {
                  haptic.stick();
                  openMenu(c);
                }}
                delayLongPress={350}
                accessibilityLabel={`${mine ? 'Tú' : partnerName}, ${time}: ${c.body}`}
                accessibilityHint="Mantén pulsado para reaccionar"
                accessibilityActions={[{ name: 'activate', label: 'Reaccionar' }]}
                onAccessibilityAction={() => openMenu(c)}
                style={{ maxWidth: '84%' }}
              >
                <View
                  style={{
                    backgroundColor: mine ? colors.postit : colors.paperRaised,
                    borderTopWidth: mine ? 0 : 2,
                    borderTopColor: colors.margin,
                    padding: spacing.md,
                    opacity: isOptimistic(c) ? 0.7 : 1,
                    boxShadow: shadows.object,
                  }}
                >
                  <Text variant="body" style={mine ? { color: colors.onPostit } : undefined}>
                    {c.body}
                  </Text>
                </View>
              </Pressable>
              <View
                style={{
                  flexDirection: mine ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: spacing.sm,
                }}
              >
                <Text variant="mono" tone="muted">
                  {mine ? time : `${partnerName} · ${time}`}
                </Text>
                {summary.map((r) => (
                  <Pressable
                    key={r.emoji}
                    onPress={() => reactTo(c, r.mine ? null : r.emoji)}
                    disabled={isOptimistic(c)}
                    hitSlop={spacing.sm}
                    accessibilityRole="button"
                    accessibilityLabel={`Reacción ${r.emoji}, ${r.count}${r.mine ? ', tuya' : ''}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.xs,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xxs,
                      backgroundColor: colors.paperRaised,
                      borderWidth: 1.5,
                      borderColor: r.mine ? colors.ink : colors.ruled,
                      borderRadius: 999,
                    }}
                  >
                    <Text variant="small">{r.emoji}</Text>
                    {r.count > 1 ? <Text variant="caption">{r.count}</Text> : null}
                  </Pressable>
                ))}
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
                      borderWidth: 1.5,
                      borderColor: selected ? colors.ink : colors.ruled,
                      backgroundColor: colors.paperRaised,
                    }}
                  >
                    <Text variant="title">{emoji}</Text>
                  </Pressable>
                );
              })}
            </View>
            {menuComment.user_id === myId ? (
              <ListRow
                label="Arrancar este comentario"
                icon="close"
                tone="destructive"
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
          toast.show({ message: errorMessage(e), tone: 'error' });
        },
      },
    );
  };

  return (
    <View style={{ gap: spacing.xs }}>
      <Divider />
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
          variant="sticker"
          accessibilityLabel="Enviar comentario"
          disabled={!valid}
          onPress={send}
        />
      </View>
    </View>
  );
}

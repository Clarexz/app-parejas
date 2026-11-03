import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Avatar,
  Button,
  FruitDot,
  Icon,
  IconButton,
  Input,
  LoadingSymbol,
  Notice,
  Sheet,
  Text,
} from '@/components';
import { useToast } from '@/components/Toast';
import { useCouple } from '@/features/couple';
import { useSignedUrl } from '@/features/profile';
import { formatTimeIn } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import {
  STORY_REACTIONS,
  STORY_REPLY_MAX,
  isStoryActive,
  storyAgo,
  storyDurationMs,
  storyTimeLeft,
  type StoryKind,
  validateReply,
} from '@/lib/stories';
import { ThemeProvider, useTheme } from '@/theme';

import type { Story } from '../api';
import {
  useActiveStories,
  useDeleteStory,
  useMarkStorySeen,
  useReactToStory,
  useReplyToStory,
  useSaveStoryToGallery,
  useStory,
  useStoryMediaUrl,
} from '../hooks';
import { groupActive } from '../group';
import { StoryFrame } from './StoryFrame';
import { StoryProgress } from './StoryProgress';

type Props = { userId?: string | null; storyId?: string | null };

const CHROME_TOP = 96;
const CHROME_BOTTOM = 150;

/** Hilo de respuestas de una story: las mías a la derecha, las de tu pareja a la izquierda. */
function Replies({
  story,
  myId,
  partnerName,
  timeZone,
  canReply,
  onSend,
}: {
  story: Story;
  myId: string;
  partnerName: string;
  timeZone: string;
  canReply: boolean;
  onSend: (body: string) => void;
}) {
  const { spacing, radius, fruit, tint } = useTheme();
  const [body, setBody] = useState('');
  const valid = validateReply(body) === null;
  const partnerFruit = fruit.partner ?? fruit.me;
  return (
    <View style={{ gap: spacing.lg }}>
      {story.replies.length === 0 ? (
        <Text variant="body" tone="muted">
          Nadie ha dicho nada todavía.
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: spacing.md }}>
          {story.replies.map((r) => {
            const mine = r.user_id === myId;
            const time = formatTimeIn(timeZone, new Date(r.created_at));
            return (
              <View
                key={r.id}
                style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: spacing.xs }}
              >
                <View
                  style={{
                    maxWidth: '84%',
                    backgroundColor: tint(mine ? fruit.me : partnerFruit),
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                  }}
                >
                  <Text variant="body">{r.body}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <FruitDot fruit={mine ? fruit.me : partnerFruit} size={8} />
                  <Text variant="note" tone="muted">
                    {mine ? time : `${partnerName} · ${time}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
      {canReply ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input
              value={body}
              onChangeText={setBody}
              placeholder="Escribe una respuesta"
              accessibilityLabel="Escribe una respuesta"
              maxLength={STORY_REPLY_MAX}
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => {
                if (!valid) return;
                onSend(body);
                setBody('');
              }}
            />
          </View>
          <IconButton
            name="send"
            variant="filled"
            accessibilityLabel="Enviar respuesta"
            disabled={!valid}
            onPress={() => {
              onSend(body);
              setBody('');
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

function ViewerBody({ userId, storyId }: Props) {
  const { colors, spacing, radius, fruit } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const { me, partner, couple } = useCouple();
  const timeZone = couple?.timezone ?? 'America/Mexico_City';
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';

  const active = useActiveStories();
  const single = useStory(storyId ?? null);

  const { list, loading, failed, refetch } = useMemo(() => {
    if (storyId) {
      return {
        list: single.story ? [single.story] : [],
        loading: single.isLoading,
        failed: single.isError,
        refetch: single.refetch,
      };
    }
    const g = groupActive(active.stories, me?.id, partner?.id);
    return {
      list: userId && userId === me?.id ? g.mine : g.partner,
      loading: active.isLoading,
      failed: active.isError,
      refetch: active.refetch,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    storyId,
    userId,
    single.story,
    single.isLoading,
    single.isError,
    active.stories,
    active.isLoading,
    active.isError,
    me?.id,
    partner?.id,
  ]);

  // Empieza en la primera no vista de tu pareja (o la primera); se fija al cargar y después ya
  // no se mueve sola aunque se vayan marcando como vistas.
  const [start, setStart] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  if (start === null && !loading && list.length > 0) {
    const firstUnseen =
      !storyId && userId !== me?.id
        ? list.findIndex((s) => !s.views.some((v) => v.user_id === me?.id))
        : 0;
    setStart(Math.max(0, firstUnseen));
  }
  const index = picked ?? start ?? 0;

  const safeIndex = Math.min(index, Math.max(0, list.length - 1));
  const story = list[safeIndex] ?? null;
  const mine = !!story && story.user_id === me?.id;
  const isActive = !!story && isStoryActive(story, new Date());
  const authorName = mine ? 'Tú' : partnerName;
  const authorFruit = mine ? fruit.me : (fruit.partner ?? fruit.me);
  const authorAvatar = useSignedUrl(mine ? me?.avatar_path : partner?.avatar_path);
  const { url: mediaUrl, isError: mediaFailed } = useStoryMediaUrl(
    story?.kind === 'photo' ? story.media_path : null,
  );

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/stories');
  }, [router]);

  const next = useCallback(() => {
    if (safeIndex >= list.length - 1) close();
    else setPicked(safeIndex + 1);
  }, [safeIndex, list.length, close]);
  const prev = useCallback(() => setPicked(Math.max(0, safeIndex - 1)), [safeIndex]);

  // Pausas: mantener pulsado, escribir y hojas abiertas.
  const [holding, setHolding] = useState(false);
  const [typing, setTyping] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const photoPending = story?.kind === 'photo' && !mediaUrl && !mediaFailed;
  const paused = holding || typing || repliesOpen || confirmDelete || photoPending || !story;

  // Marca visto al mostrar una story de tu pareja.
  const markSeen = useMarkStorySeen();
  const marked = useRef(new Set<string>());
  useEffect(() => {
    if (!story || mine || marked.current.has(story.id)) return;
    marked.current.add(story.id);
    markSeen.mutate(story.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, mine]);

  const react = useReactToStory();
  const reply = useReplyToStory();
  const save = useSaveStoryToGallery();
  const del = useDeleteStory();
  const [draft, setDraft] = useState('');

  const myReaction = story?.reactions.find((r) => r.user_id === me?.id)?.emoji ?? null;
  const partnerReaction = story?.reactions.find((r) => r.user_id !== me?.id)?.emoji ?? null;
  const seenByPartner = story?.views.find((v) => v.user_id !== me?.id) ?? null;

  const sendReply = (body: string) => {
    if (!story) return;
    reply.mutate(
      { id: story.id, body },
      {
        onSuccess: () => toast.show({ message: `Ya le llegó a ${partnerName}.`, tone: 'success' }),
        onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
      },
    );
  };
  const sendInline = () => {
    if (validateReply(draft) !== null) return;
    sendReply(draft);
    setDraft('');
    setTyping(false);
  };

  const download = () => {
    if (!story) return;
    save.mutate(story, {
      onSuccess: (result) =>
        result === 'saved'
          ? toast.show({ message: 'Foto guardada en tu galería.', tone: 'success' })
          : toast.show({
              message: 'No tenemos permiso para tu galería. Actívalo en los ajustes del celular.',
              tone: 'error',
            }),
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
    });
  };
  const tear = () => {
    if (!story) return;
    setConfirmDelete(false);
    const last = list.length <= 1;
    del.mutate(story.id, {
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
    });
    if (last) close();
  };

  // Deslizar hacia abajo cierra.
  const [dragY, setDragY] = useState(0);
  const lastDy = useRef(0);
  const swipe = usePanGesture({
    runOnJS: true,
    activeOffsetY: [-18, 18],
    failOffsetX: [-24, 24],
    onUpdate: (e) => {
      lastDy.current = e.translationY;
      setDragY(Math.max(0, e.translationY));
    },
    onFinalize: () => {
      const far = lastDy.current > 110;
      lastDy.current = 0;
      setDragY(0);
      if (far) close();
    },
  });

  const available = winH - insets.top - insets.bottom - CHROME_TOP - CHROME_BOTTOM;
  const frameW = Math.max(200, Math.min(winW, Math.floor((available * 9) / 16)));

  // --- estados sin story ---
  if (!story) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <View style={{ marginLeft: -spacing.sm }}>
          <IconButton name="close" accessibilityLabel="Cerrar" onPress={close} />
        </View>
        {loading ? (
          <View
            accessibilityLabel="Abriendo la story"
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <LoadingSymbol />
          </View>
        ) : failed ? (
          <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
            No pudimos abrirla. Tu celular está sin señal; revisa tu internet y vuelve a intentar.
          </Notice>
        ) : (
          <View style={{ gap: spacing.md }}>
            <Text variant="h2" accessibilityRole="header">
              Esta story ya se borró
            </Text>
            <Text variant="body" tone="muted">
              Las stories duran 24 horas. Si era tuya, la encuentras en tu archivo.
            </Text>
            <Button title="Cerrar" variant="secondary" onPress={close} fullWidth />
          </View>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + spacing.sm,
        }}
      >
        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          <StoryProgress
            count={list.length}
            index={safeIndex}
            durationMs={storyDurationMs(story.kind as StoryKind)}
            color={authorFruit.hex}
            paused={paused}
            onComplete={next}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Avatar
              name={authorName}
              source={authorAvatar ?? undefined}
              size={44}
              fruit={authorFruit}
              ring
            />
            <View style={{ flex: 1 }}>
              <Text variant="ui" numberOfLines={1}>
                {authorName}
              </Text>
              <Text variant="note" tone="muted" numberOfLines={1}>
                {storyAgo(story.created_at, new Date())}
                {isActive
                  ? ` · ${storyTimeLeft(story.expires_at, new Date())}`
                  : ' · en tu archivo'}
              </Text>
            </View>
            <IconButton name="close" accessibilityLabel="Cerrar" onPress={close} />
          </View>
        </View>

        <GestureDetector gesture={swipe}>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ translateY: dragY }],
              opacity: 1 - Math.min(0.5, dragY / 400),
            }}
          >
            <View style={{ width: frameW }}>
              <StoryFrame
                story={story}
                width={frameW}
                mediaUrl={mediaUrl}
                caption={story.kind === 'photo' ? story.text : null}
                fruit={authorFruit}
              />
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  flexDirection: 'row',
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Story anterior"
                  onPress={prev}
                  onLongPress={() => setHolding(true)}
                  onPressOut={() => setHolding(false)}
                  delayLongPress={180}
                  style={{ flex: 35 }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Story siguiente"
                  onPress={next}
                  onLongPress={() => setHolding(true)}
                  onPressOut={() => setHolding(false)}
                  delayLongPress={180}
                  style={{ flex: 65 }}
                />
              </View>
              {mediaFailed ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '45%',
                    alignItems: 'center',
                  }}
                >
                  <Text variant="note" tone="muted">
                    La foto no cargó.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </GestureDetector>

        <View
          style={{ paddingHorizontal: spacing.lg, gap: spacing.sm, minHeight: CHROME_BOTTOM - 40 }}
        >
          {mine ? (
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {seenByPartner ? (
                  <FruitDot fruit={fruit.partner ?? fruit.me} />
                ) : (
                  <Icon name="eye" size={20} color={colors.inkMuted} />
                )}
                <Text variant="note" tone={seenByPartner ? 'ink' : 'muted'} style={{ flex: 1 }}>
                  {seenByPartner
                    ? `Vista por ${partnerName} · ${formatTimeIn(timeZone, new Date(seenByPartner.seen_at))}`
                    : `${partnerName} todavía no la ve`}
                  {partnerReaction ? `  ${partnerName} reaccionó ${partnerReaction}` : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View style={{ flex: 1, alignItems: 'flex-start' }}>
                  <Button
                    title={`Respuestas (${story.replies.length})`}
                    variant="secondary"
                    size="sm"
                    onPress={() => setRepliesOpen(true)}
                  />
                </View>
                {story.kind === 'photo' ? (
                  <IconButton
                    name="download"
                    accessibilityLabel="Descargar la foto"
                    disabled={save.isPending}
                    onPress={download}
                  />
                ) : null}
                <IconButton
                  name="trash"
                  accessibilityLabel="Borrar esta story"
                  onPress={() => setConfirmDelete(true)}
                />
              </View>
            </View>
          ) : isActive ? (
            <View style={{ gap: spacing.sm }}>
              <View
                accessibilityRole="radiogroup"
                style={{ flexDirection: 'row', justifyContent: 'space-between' }}
              >
                {STORY_REACTIONS.map((emoji) => {
                  const selected = emoji === myReaction;
                  return (
                    <Pressable
                      key={emoji}
                      accessibilityRole="radio"
                      accessibilityLabel={`Reaccionar con ${emoji}`}
                      accessibilityState={{ selected }}
                      onPress={() => {
                        if (!selected) haptic.light();
                        react.mutate(
                          { id: story.id, emoji: selected ? null : emoji },
                          {
                            onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
                          },
                        );
                      }}
                      style={{
                        width: 48,
                        height: 48,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? colors.surface2 : 'transparent',
                        borderWidth: 2,
                        borderColor: selected ? fruit.me.hex : 'transparent',
                        borderRadius: radius.pill,
                      }}
                    >
                      <Text variant="h3">{emoji}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Input
                    value={draft}
                    onChangeText={setDraft}
                    placeholder={`Respóndele a ${partnerName}…`}
                    accessibilityLabel={`Respóndele a ${partnerName}`}
                    maxLength={STORY_REPLY_MAX}
                    returnKeyType="send"
                    submitBehavior="submit"
                    onSubmitEditing={sendInline}
                    onFocus={() => setTyping(true)}
                    onBlur={() => setTyping(false)}
                  />
                </View>
                <IconButton
                  name="send"
                  variant="filled"
                  accessibilityLabel="Enviar respuesta"
                  disabled={validateReply(draft) !== null}
                  onPress={sendInline}
                />
              </View>
              {story.replies.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRepliesOpen(true)}
                  style={{ minHeight: 48, justifyContent: 'center' }}
                >
                  <Text variant="note" tone="muted" style={{ textDecorationLine: 'underline' }}>
                    Ver respuestas ({story.replies.length})
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text variant="label" tone="muted">
              Ya caducó
            </Text>
          )}
        </View>
      </View>

      <Sheet
        visible={repliesOpen}
        onClose={() => setRepliesOpen(false)}
        title={`Respuestas (${story.replies.length})`}
      >
        <Replies
          story={story}
          myId={me?.id ?? ''}
          partnerName={partnerName}
          timeZone={timeZone}
          canReply={isActive}
          onSend={sendReply}
        />
      </Sheet>

      <Sheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Borrar esta story?"
      >
        <View style={{ gap: spacing.lg }}>
          <Text variant="body" tone="muted">
            Deja de verse para los dos y no se puede deshacer.
          </Text>
          <View style={{ gap: spacing.sm }}>
            <Button title="Borrar" variant="danger" fullWidth onPress={tear} />
            <Button
              title="Mejor no"
              variant="secondary"
              fullWidth
              onPress={() => setConfirmDelete(false)}
            />
          </View>
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

/** Visor a pantalla completa, siempre "de noche" (DISENO §7 y §8). */
export function StoryViewer(props: Props) {
  return (
    <ThemeProvider scheme="dark">
      <ViewerBody {...props} />
    </ThemeProvider>
  );
}

import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Button,
  Chip,
  IconButton,
  Input,
  LoadingLines,
  Note,
  Paper,
  SealOverlay,
  Sheet,
  Text,
} from '@/components';
import { useToast } from '@/components/Toast';
import type { Stroke } from '@/lib/drawing';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import {
  STORY_BGS,
  STORY_CAPTION_MAX,
  STORY_FONTS,
  STORY_FONT_LABELS,
  STORY_TEXT_MAX,
  validateStoryText,
  type StoryBg,
  type StoryFont,
  type StorySticker,
} from '@/lib/stories';
import { useTheme } from '@/theme';

import { useCreateStory, type CreateStoryVars } from '../hooks';
import { DrawingPad } from './DrawingPad';
import { StickerLayer } from './StickerLayer';
import { StoryFrame, storyBgColor, storyTextStyle } from './StoryFrame';

export type ComposerKind = 'camera' | 'library' | 'text' | 'drawing';

export function parseComposerKind(value: string | string[] | undefined): ComposerKind {
  const v = Array.isArray(value) ? value[0] : value;
  return v === 'camera' || v === 'library' || v === 'drawing' ? v : 'text';
}

type PhotoState = 'asking' | 'ready' | 'denied' | 'canceled';

/** Fila de cuadritos de papel para elegir el fondo. */
function BgPicker({ value, onChange }: { value: StoryBg; onChange: (bg: StoryBg) => void }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="hand" tone="muted">
        Fondo
      </Text>
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}
      >
        {STORY_BGS.map((bg) => {
          const selected = bg === value;
          return (
            <Pressable
              key={bg}
              accessibilityRole="radio"
              accessibilityLabel={`Fondo ${bg}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(bg)}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  backgroundColor: storyBgColor(bg, colors),
                  borderWidth: 1.5,
                  borderColor: selected ? colors.ink : colors.inkMuted,
                  boxShadow: selected ? `0 4px 8px -3px ${colors.shadow}` : undefined,
                  transform: [{ scale: selected ? 1.12 : 1 }],
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Crear una story (`/story/new?kind=camera|library|text|drawing`): vista previa en `StoryFrame`,
 * pie o texto, fondo, dibujo y stickers. Al pegar sube con avance y sella.
 */
export function StoryComposer({ kind }: { kind: ComposerKind }) {
  const theme = useTheme();
  const { colors, spacing, fonts } = theme;
  const router = useRouter();
  const toast = useToast();
  const { width: windowWidth } = useWindowDimensions();
  const create = useCreateStory();

  const frameWidth = Math.min(windowWidth - theme.page.contentLeft - theme.page.contentRight, 360);

  const isPhoto = kind === 'camera' || kind === 'library';
  const [photoState, setPhotoState] = useState<PhotoState>(isPhoto ? 'asking' : 'ready');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [text, setText] = useState('');
  const [bg, setBg] = useState<StoryBg>(kind === 'text' ? 'postit' : 'paper');
  const [font, setFont] = useState<StoryFont>('hand');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [inputHeight, setInputHeight] = useState(0);
  const [stickers, setStickers] = useState<StorySticker[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sealed, setSealed] = useState(false);
  const leaving = useRef(false);

  const dirty = !!caption || !!text.trim() || strokes.length > 0 || stickers.length > 0;

  const leave = useCallback(() => {
    leaving.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/stories');
  }, [router]);

  // Cámara o galería: se abre al entrar. Cancelar regresa.
  useEffect(() => {
    if (!isPhoto) return;
    let alive = true;
    void (async () => {
      try {
        if (kind === 'camera') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!alive) return;
          if (!permission.granted) {
            setPhotoState('denied');
            return;
          }
        }
        const options = {
          mediaTypes: ['images'] as ImagePicker.MediaType[],
          allowsEditing: true,
          aspect: [9, 16] as [number, number],
          quality: 1,
        };
        const result =
          kind === 'camera'
            ? await ImagePicker.launchCameraAsync(options)
            : await ImagePicker.launchImageLibraryAsync(options);
        if (!alive) return;
        const uri = result.canceled ? null : (result.assets[0]?.uri ?? null);
        if (!uri) {
          setPhotoState('canceled');
          leave();
          return;
        }
        setPhotoUri(uri);
        setPhotoState('ready');
      } catch (e) {
        if (!alive) return;
        toast.show({ message: errorMessage(e), tone: 'error' });
        leave();
      }
    })();
    return () => {
      alive = false;
    };
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestClose = useCallback(() => {
    if (create.isPending || sealed) return;
    if (dirty) setConfirmClose(true);
    else leave();
  }, [create.isPending, sealed, dirty, leave]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => sub.remove();
  }, [requestClose]);

  const valid =
    kind === 'text'
      ? validateStoryText(text) === null
      : kind === 'drawing'
        ? strokes.length > 0
        : !!photoUri;

  const publish = () => {
    if (!valid || create.isPending) return;
    const common = { stickers, onProgress: setProgress };
    let vars: CreateStoryVars;
    if (kind === 'text') vars = { kind: 'text', text: text.trim(), bg, font, ...common };
    else if (kind === 'drawing') vars = { kind: 'drawing', strokes, bg, ...common };
    else
      vars = { kind: 'photo', uri: photoUri as string, caption: caption.trim() || null, ...common };
    create.mutate(vars, {
      onSuccess: () => {
        setSealed(true);
        haptic.stamp();
        setTimeout(leave, 900);
      },
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
    });
  };

  const photoFrame = kind === 'camera' || kind === 'library';
  const draft = {
    kind: kind === 'text' ? 'text' : kind === 'drawing' ? 'drawing' : 'photo',
    text: kind === 'text' ? text : caption,
    bg: photoFrame ? null : bg,
    font,
    strokes,
    stickers,
  };
  const publishing = create.isPending;

  // --- estados de la foto ---
  if (isPhoto && photoState !== 'ready') {
    return (
      <View style={{ flex: 1 }}>
        <Paper />
        <View style={{ flex: 1, padding: spacing.xl, paddingTop: spacing.xxxl, gap: spacing.lg }}>
          <IconButton name="close" accessibilityLabel="Cerrar" onPress={leave} />
          {photoState === 'denied' ? (
            <View style={{ gap: spacing.md }}>
              <Text variant="title" accessibilityRole="header">
                La cámara está apagada
              </Text>
              <Note>
                <Text variant="hand" style={{ color: colors.onPostit }}>
                  Para tomar la foto necesitamos permiso de cámara. Actívalo en los ajustes del
                  celular, o elige una foto de la galería.
                </Text>
              </Note>
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                <Button title="Abrir ajustes" onPress={() => void Linking.openSettings()} />
                <Button
                  title="Mejor la galería"
                  variant="ghost"
                  onPress={() =>
                    router.replace({ pathname: '/story/new', params: { kind: 'library' } })
                  }
                />
              </View>
            </View>
          ) : (
            <LoadingLines count={3} accessibilityLabel="Abriendo la foto" />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Paper />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: spacing.xxxl,
          paddingBottom: spacing.xxxl,
          paddingLeft: theme.page.contentLeft,
          paddingRight: theme.page.contentRight,
          gap: spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -spacing.sm }}>
          <IconButton name="close" accessibilityLabel="Cerrar" onPress={requestClose} />
          <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
            {kind === 'text' ? 'Escribir algo' : kind === 'drawing' ? 'Dibujar' : 'Tu foto'}
          </Text>
          <IconButton
            name="sticker"
            accessibilityLabel="Pegar un sticker"
            disabled={publishing}
            onPress={() => setPickerOpen(true)}
          />
        </View>

        {kind === 'drawing' ? (
          <DrawingPad
            strokes={strokes}
            onChange={setStrokes}
            bg={bg}
            width={frameWidth}
            onLimit={() =>
              toast.show({ message: 'Ya no caben más trazos. Deshaz alguno para seguir.' })
            }
          >
            <StickerLayer
              stickers={stickers}
              onChange={setStickers}
              width={frameWidth}
              pickerVisible={pickerOpen}
              onPickerClose={() => setPickerOpen(false)}
            />
          </DrawingPad>
        ) : (
          <View style={{ width: frameWidth, boxShadow: `0 4px 8px -3px ${colors.shadow}` }}>
            <StoryFrame
              story={draft}
              width={frameWidth}
              mediaUrl={photoFrame ? photoUri : null}
              caption={photoFrame ? caption.trim() || null : null}
            >
              {kind === 'text' ? (
                <TextInput
                  value={text}
                  onChangeText={setText}
                  multiline
                  scrollEnabled={false}
                  onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
                  maxLength={STORY_TEXT_MAX}
                  placeholder="Escribe algo…"
                  placeholderTextColor={
                    storyTextStyle(draft, 0, frameWidth, { colors, fonts }).color
                  }
                  selectionColor={colors.jamaica}
                  accessibilityLabel="Texto de la story"
                  editable={!publishing}
                  style={[
                    storyTextStyle(draft, text.length, frameWidth, { colors, fonts }),
                    { width: '100%', padding: 0, height: Math.max(inputHeight, 48) },
                  ]}
                />
              ) : null}
            </StoryFrame>
            <StickerLayer
              stickers={stickers}
              onChange={setStickers}
              width={frameWidth}
              pickerVisible={pickerOpen}
              onPickerClose={() => setPickerOpen(false)}
            />
          </View>
        )}

        {kind === 'text' ? (
          <View style={{ gap: spacing.md }}>
            <Text
              variant="small"
              tone={text.length >= STORY_TEXT_MAX ? 'chile' : 'muted'}
              accessibilityLiveRegion="polite"
            >
              {text.length}/{STORY_TEXT_MAX}
            </Text>
            <BgPicker value={bg} onChange={setBg} />
            <View style={{ gap: spacing.xs }}>
              <Text variant="hand" tone="muted">
                Letra
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                {STORY_FONTS.map((f) => (
                  <Chip
                    key={f}
                    label={STORY_FONT_LABELS[f]}
                    color={f === 'hand' ? 'yellow' : f === 'body' ? 'mint' : 'pink'}
                    selected={f === font}
                    onPress={() => setFont(f)}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {kind === 'drawing' ? <BgPicker value={bg} onChange={setBg} /> : null}

        {photoFrame ? (
          <View style={{ gap: spacing.xs }}>
            <Input
              label="Pie de foto (opcional)"
              value={caption}
              onChangeText={setCaption}
              maxLength={STORY_CAPTION_MAX}
              placeholder="Lo que quieras decir"
              editable={!publishing}
            />
            <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
              {caption.length}/{STORY_CAPTION_MAX}
            </Text>
          </View>
        ) : null}

        <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
          <Button
            title={publishing ? 'Pegando…' : 'Pegar story'}
            onPress={publish}
            disabled={!valid}
            loading={publishing}
          />
          {publishing && photoFrame ? (
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
              style={{ width: frameWidth, height: 3, backgroundColor: colors.ruled }}
            >
              <View
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: 3,
                  backgroundColor: colors.jamaica,
                }}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Sheet
        visible={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="¿Tirar esta hoja?"
      >
        <View style={{ gap: spacing.lg }}>
          <Text variant="body" tone="muted">
            Lo que llevas de esta story se va a la basura.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Button
              title="Tirarla"
              onPress={() => {
                setConfirmClose(false);
                leave();
              }}
            />
            <Button title="Seguir" variant="ghost" onPress={() => setConfirmClose(false)} />
          </View>
        </View>
      </Sheet>

      {sealed ? <SealOverlay /> : null}
    </View>
  );
}

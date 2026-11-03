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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ArrivalOverlay,
  Button,
  Chip,
  IconButton,
  Input,
  LoadingSymbol,
  Notice,
  Sheet,
  Text,
} from '@/components';
import { useToast } from '@/components/Toast';
import type { Stroke } from '@/lib/drawing';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import {
  STORY_CAPTION_MAX,
  STORY_FONTS,
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
import { StoryFrame, storyTextStyle } from './StoryFrame';
import { BG_OPTIONS, FONT_LABELS, bgForFruit, storyBgColor, storyBgName } from './palette';

export type ComposerKind = 'camera' | 'library' | 'text' | 'drawing';

export function parseComposerKind(value: string | string[] | undefined): ComposerKind {
  const v = Array.isArray(value) ? value[0] : value;
  return v === 'camera' || v === 'library' || v === 'drawing' ? v : 'text';
}

type PhotoState = 'asking' | 'ready' | 'denied' | 'canceled';

/** Círculos de fruta para elegir el fondo. */
function BgPicker({ value, onChange }: { value: StoryBg; onChange: (bg: StoryBg) => void }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="muted">
        Fondo
      </Text>
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}
      >
        {BG_OPTIONS.map((bg) => {
          const selected = bg === value;
          return (
            <Pressable
              key={bg}
              accessibilityRole="radio"
              accessibilityLabel={`Fondo ${storyBgName(bg)}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(bg)}
              style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.pill,
                  borderWidth: 2,
                  borderColor: selected ? colors.ink : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: radius.pill,
                    backgroundColor: storyBgColor(bg),
                    borderWidth: 1,
                    borderColor: colors.line,
                  }}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Crear una story (`/story/new?kind=camera|library|text|drawing`): vista previa en `StoryFrame`,
 * pie o texto, fondo, dibujo y stickers. Al publicar sube con avance y llega la rendija.
 */
export function StoryComposer({ kind }: { kind: ComposerKind }) {
  const theme = useTheme();
  const { colors, spacing, fonts, page, fruit } = theme;
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const create = useCreateStory();

  const frameWidth = Math.min(windowWidth - page.gutter * 2, 320);

  const isPhoto = kind === 'camera' || kind === 'library';
  const [photoState, setPhotoState] = useState<PhotoState>(isPhoto ? 'asking' : 'ready');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [text, setText] = useState('');
  const [bg, setBg] = useState<StoryBg>(
    kind === 'text' ? (bgForFruit(fruit.me) ?? 'cempasuchil') : 'paper',
  );
  const [font, setFont] = useState<StoryFont>('hand');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [inputHeight, setInputHeight] = useState(0);
  const [stickers, setStickers] = useState<StorySticker[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [progress, setProgress] = useState(0);
  const [arrived, setArrived] = useState(false);
  const leaving = useRef(false);

  const dirty = !!caption || !!text.trim() || strokes.length > 0 || stickers.length > 0;

  const leave = useCallback(() => {
    if (leaving.current) return;
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
    if (create.isPending || arrived) return;
    if (dirty) setConfirmClose(true);
    else leave();
  }, [create.isPending, arrived, dirty, leave]);

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
      onSuccess: () => setArrived(true),
      onError: (e) => {
        haptic.error();
        toast.show({ message: errorMessage(e), tone: 'error' });
      },
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
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: page.gutter,
            paddingTop: insets.top + spacing.sm,
            gap: spacing.lg,
          }}
        >
          <View style={{ marginLeft: -spacing.sm }}>
            <IconButton name="close" accessibilityLabel="Cerrar" onPress={leave} />
          </View>
          {photoState === 'denied' ? (
            <View style={{ gap: spacing.lg }}>
              <Text variant="h2" accessibilityRole="header">
                La cámara está apagada
              </Text>
              <Notice>
                Para tomar la foto necesitamos permiso de cámara. Actívalo en los ajustes del
                celular, o elige una foto de la galería.
              </Notice>
              <View style={{ gap: spacing.sm }}>
                <Button
                  title="Abrir ajustes"
                  fullWidth
                  onPress={() => void Linking.openSettings()}
                />
                <Button
                  title="Mejor la galería"
                  variant="secondary"
                  fullWidth
                  onPress={() =>
                    router.replace({ pathname: '/story/new', params: { kind: 'library' } })
                  }
                />
              </View>
            </View>
          ) : (
            <View
              accessibilityLabel="Abriendo la foto"
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <LoadingSymbol />
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: page.gutter,
          gap: spacing.xl,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -spacing.sm }}>
          <IconButton name="close" accessibilityLabel="Cerrar" onPress={requestClose} />
          <Text variant="h3" accessibilityRole="header" style={{ flex: 1 }}>
            {kind === 'text' ? 'Escribir algo' : kind === 'drawing' ? 'Dibujar' : 'Tu foto'}
          </Text>
          <IconButton
            name="sticker"
            variant="soft"
            accessibilityLabel="Sumar un sticker"
            disabled={publishing}
            onPress={() => setPickerOpen(true)}
          />
        </View>

        <View style={{ alignItems: 'center' }}>
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
            <View style={{ width: frameWidth }}>
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
                    placeholderTextColor={storyTextStyle(draft, 0, frameWidth, { fonts }).color}
                    selectionColor={storyTextStyle(draft, 0, frameWidth, { fonts }).color}
                    accessibilityLabel="Texto de la story"
                    editable={!publishing}
                    style={[
                      storyTextStyle(draft, text.length, frameWidth, { fonts }),
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
        </View>

        {kind === 'text' ? (
          <View style={{ gap: spacing.lg }}>
            <Text
              variant="note"
              tone={text.length >= STORY_TEXT_MAX ? 'danger' : 'muted'}
              accessibilityLiveRegion="polite"
            >
              {text.length}/{STORY_TEXT_MAX}
            </Text>
            <BgPicker value={bg} onChange={setBg} />
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="muted">
                Letra
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                {STORY_FONTS.map((f) => (
                  <Chip
                    key={f}
                    label={FONT_LABELS[f]}
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
            <Text variant="note" tone="muted" accessibilityLiveRegion="polite">
              {caption.length}/{STORY_CAPTION_MAX}
            </Text>
          </View>
        ) : null}

        <View style={{ gap: spacing.md }}>
          <Button
            title="Publicar"
            onPress={publish}
            disabled={!valid}
            loading={publishing}
            fullWidth
          />
          {publishing && photoFrame ? (
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
              style={{ height: 4, borderRadius: 2, backgroundColor: colors.line }}
            >
              <View
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: fruit.me.hex,
                }}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Sheet
        visible={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="¿Salir sin publicar?"
      >
        <View style={{ gap: spacing.lg }}>
          <Text variant="body" tone="muted">
            Lo que llevas de esta story se pierde.
          </Text>
          <View style={{ gap: spacing.sm }}>
            <Button
              title="Salir"
              variant="danger"
              fullWidth
              onPress={() => {
                haptic.warning();
                setConfirmClose(false);
                leave();
              }}
            />
            <Button
              title="Seguir"
              variant="secondary"
              fullWidth
              onPress={() => setConfirmClose(false)}
            />
          </View>
        </View>
      </Sheet>

      {arrived ? <ArrivalOverlay text="Ya llegó." onDone={leave} /> : null}
    </View>
  );
}

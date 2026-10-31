import { useEffect, useRef, useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { Chip, Sheet, Text } from '@/components';
import { CANVAS_H, CANVAS_W } from '@/lib/drawing';
import { haptic } from '@/lib/haptics';
import { STORY_MAX_STICKERS, STORY_STICKERS, clampSticker, type StorySticker } from '@/lib/stories';
import { useTheme } from '@/theme';

type Props = {
  stickers: StorySticker[];
  onChange: (stickers: StorySticker[]) => void;
  /** Ancho del lienzo en dp (el mismo del `StoryFrame` que cubre). */
  width: number;
  /** El selector de stickers (un `Sheet`) está abierto. */
  pickerVisible: boolean;
  onPickerClose: () => void;
};

type ItemProps = {
  sticker: StorySticker;
  width: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
};

function DraggableSticker({ sticker, width, selected, onSelect, onMove, onRemove }: ItemProps) {
  const { colors, radius } = useTheme();
  const height = (width * CANVAS_H) / CANVAS_W;
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const latest = useRef({ sticker, onMove, width, height });
  useEffect(() => {
    latest.current = { sticker, onMove, width, height };
  });
  const delta = useRef({ dx: 0, dy: 0 });

  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 4,
    onUpdate: (e) => {
      delta.current = { dx: e.translationX, dy: e.translationY };
      setDrag(delta.current);
    },
    onFinalize: () => {
      const l = latest.current;
      const { dx, dy } = delta.current;
      delta.current = { dx: 0, dy: 0 };
      setDrag(null);
      if (dx !== 0 || dy !== 0) l.onMove(l.sticker.x + dx / l.width, l.sticker.y + dy / l.height);
    },
  });

  const size = width * 0.13 * sticker.s;
  const box = size * 1.4;
  return (
    <GestureDetector gesture={pan}>
      <View
        style={{
          position: 'absolute',
          left: sticker.x * width - box / 2 + (drag?.dx ?? 0),
          top: sticker.y * height - box / 2 + (drag?.dy ?? 0),
          width: box,
          height: box,
          transform: [{ rotate: `${sticker.r}deg` }],
        }}
      >
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Sticker ${sticker.e}`}
          accessibilityHint="Toca para ajustarlo. Mantén pulsado para quitarlo."
          onPress={onSelect}
          onLongPress={() => {
            haptic.stick();
            onRemove();
          }}
          delayLongPress={450}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: selected ? 1.5 : 0,
            borderStyle: 'dashed',
            borderColor: colors.jamaica,
            borderRadius: radius.xs,
          }}
        >
          <RNText style={{ fontSize: size, lineHeight: size * 1.2 }} allowFontScaling={false}>
            {sticker.e}
          </RNText>
        </Pressable>
      </View>
    </GestureDetector>
  );
}

/**
 * Stickers sobre el lienzo (DISENO §7): se eligen de `STORY_STICKERS` en un `Sheet`, aparecen al
 * centro, se arrastran, se tocan para ajustar (tamaño, giro, quitar) y con pulsación larga se
 * quitan. Va con `position: absolute` encima del `StoryFrame` del mismo ancho.
 */
export function StickerLayer({ stickers, onChange, width, pickerVisible, onPickerClose }: Props) {
  const { colors, spacing } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const full = stickers.length >= STORY_MAX_STICKERS;

  const update = (i: number, next: Partial<StorySticker>) =>
    onChange(stickers.map((s, j) => (j === i ? clampSticker({ ...s, ...next }) : s)));
  const remove = (i: number) => {
    onChange(stickers.filter((_, j) => j !== i));
    setSelected(null);
  };
  const add = (e: string) => {
    if (full) return;
    haptic.stick();
    onChange([...stickers, clampSticker({ e, x: 0.5, y: 0.5, s: 1.4, r: 0 })]);
    setSelected(stickers.length);
    onPickerClose();
  };

  const current = selected != null ? stickers[selected] : null;

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
      >
        {stickers.map((s, i) => (
          <DraggableSticker
            key={i}
            sticker={s}
            width={width}
            selected={selected === i}
            onSelect={() => setSelected(selected === i ? null : i)}
            onMove={(x, y) => update(i, { x, y })}
            onRemove={() => remove(i)}
          />
        ))}
        {current && selected != null ? (
          <View
            style={{
              position: 'absolute',
              left: spacing.sm,
              right: spacing.sm,
              bottom: spacing.sm,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
              padding: spacing.sm,
              backgroundColor: colors.paperRaised,
              boxShadow: `0 4px 8px -3px ${colors.shadow}`,
            }}
          >
            <Chip label="Más grande" onPress={() => update(selected, { s: current.s + 0.25 })} />
            <Chip label="Más chico" onPress={() => update(selected, { s: current.s - 0.25 })} />
            <Chip
              label="Girar"
              onPress={() => update(selected, { r: current.r >= 45 ? -45 : current.r + 15 })}
            />
            <Chip label="Quitar" color="pink" onPress={() => remove(selected)} />
          </View>
        ) : null}
      </View>

      <Sheet visible={pickerVisible} onClose={onPickerClose} title="Pega un sticker">
        {full ? (
          <Text variant="body" tone="muted">
            Ya pegaste {STORY_MAX_STICKERS}. Quita alguno para poner otro.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {STORY_STICKERS.map((e) => (
              <Pressable
                key={e}
                accessibilityRole="button"
                accessibilityLabel={`Pegar ${e}`}
                onPress={() => add(e)}
                style={({ pressed }) => ({
                  width: 56,
                  height: 56,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <RNText style={{ fontSize: 32 }}>{e}</RNText>
              </Pressable>
            ))}
          </View>
        )}
      </Sheet>
    </>
  );
}

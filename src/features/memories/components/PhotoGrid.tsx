import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Pressable, View, type AccessibilityActionEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Icon, Stamp } from '@/components';
import { haptic } from '@/lib/haptics';
import { indexFromOffset, offsetFromIndex, type GridSpec } from '@/lib/memories';
import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

export type GridItem = { key: string; uri?: string };

const COLUMNS = 3;
const LONG_PRESS_MS = 250;

type Props = {
  items: GridItem[];
  /** Ancho total de la rejilla en dp. */
  width: number;
  /** Pasa el elemento `from` a la posición `to` (la lista la mueve quien la guarda). */
  onMove: (from: number, to: number) => void;
  onRemove: (key: string) => void;
  /** Avisa si hay un arrastre en curso (para apagar el scroll de la pantalla). */
  onDragChange?: (dragging: boolean) => void;
  disabled?: boolean;
};

type CellProps = {
  item: GridItem;
  index: number;
  count: number;
  grid: GridSpec;
  gap: number;
  dragKey: SharedValue<string>;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  onRemove: (key: string) => void;
  onMove: (from: number, to: number) => void;
  disabled: boolean;
};

function Cell({
  item,
  index,
  count,
  grid,
  gap,
  dragKey,
  dragX,
  dragY,
  onRemove,
  onMove,
  disabled,
}: CellProps) {
  const { colors, motion, shadows } = useTheme();
  const reduced = useReducedMotion();
  const target = offsetFromIndex(index, grid);
  const x = useSharedValue(target.x);
  const y = useSharedValue(target.y);
  const key = item.key;

  // Cuando la foto cambia de lugar se desliza a su celda (sin animar con "reducir movimiento").
  useEffect(() => {
    if (reduced) {
      x.value = target.x;
      y.value = target.y;
    } else {
      x.value = withTiming(target.x, { duration: motion.duration.fast });
      y.value = withTiming(target.y, { duration: motion.duration.fast });
    }
  }, [target.x, target.y, reduced, motion, x, y]);

  const animated = useAnimatedStyle(() => {
    const dragging = dragKey.value === key;
    return {
      zIndex: dragging ? 10 : 0,
      transform: [
        { translateX: dragging ? dragX.value : x.value },
        { translateY: dragging ? dragY.value : y.value },
        { scale: dragging ? 1.06 : 1 },
      ],
    };
  });

  const photo = grid.cellWidth - gap - 8;
  const label = `Foto ${index + 1} de ${count}${index === 0 ? ', portada' : ''}`;
  const tilt = tiltFor(item.key, 2);

  return (
    <Animated.View
      accessible
      accessibilityLabel={label}
      accessibilityHint="Mantén presionada y arrastra para cambiar el orden"
      accessibilityActions={[
        { name: 'decrement', label: 'Mover antes' },
        { name: 'increment', label: 'Mover después' },
      ]}
      onAccessibilityAction={(e: AccessibilityActionEvent) => {
        if (disabled) return;
        if (e.nativeEvent.actionName === 'decrement' && index > 0) onMove(index, index - 1);
        if (e.nativeEvent.actionName === 'increment' && index < count - 1) onMove(index, index + 1);
      }}
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: grid.cellWidth,
          height: grid.cellHeight,
          padding: gap / 2,
        },
        animated,
      ]}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.polaroid,
          padding: 4,
          boxShadow: shadows.object,
          transform: [{ rotate: `${tilt}deg` }],
        }}
      >
        <View style={{ width: photo, height: photo, backgroundColor: colors.photoEmpty }}>
          {item.uri ? (
            <Image
              source={{ uri: item.uri }}
              style={{ width: photo, height: photo }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>
        {index === 0 ? (
          <Stamp
            style={{
              position: 'absolute',
              left: -4,
              bottom: 6,
              backgroundColor: colors.polaroid,
            }}
          >
            PORTADA
          </Stamp>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Quitar la foto ${index + 1}`}
        disabled={disabled}
        onPress={() => onRemove(item.key)}
        style={{
          position: 'absolute',
          right: -6,
          top: -6,
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.paperRaised,
            borderWidth: 1.5,
            borderColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="close" size={16} color={colors.ink} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Miniaturas de las fotos en 3 columnas, reordenables: pulsación larga y arrastrar (un solo
 * `Pan` de gesture-handler sobre la rejilla; la celda que se mueve sigue al dedo con reanimated
 * y las demás se acomodan con `indexFromOffset`/`moveItem`). La primera es la portada.
 */
export function PhotoGrid({
  items,
  width,
  onMove,
  onRemove,
  onDragChange,
  disabled = false,
}: Props) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const gap = 8;
  const cell = width / COLUMNS;
  const grid: GridSpec = {
    columns: COLUMNS,
    cellWidth: cell,
    cellHeight: cell,
    count: items.length,
  };
  const rows = Math.max(1, Math.ceil(items.length / COLUMNS));

  const dragKey = useSharedValue('');
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const drag = useRef({ current: -1, startX: 0, startY: 0 });
  const latest = useRef({
    items,
    grid,
    onMove,
    onDragChange,
    reduced,
    duration: motion.duration.fast,
  });
  useEffect(() => {
    latest.current = { items, grid, onMove, onDragChange, reduced, duration: motion.duration.fast };
  });
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    },
    [],
  );

  const pan = usePanGesture({
    runOnJS: true,
    enabled: !disabled,
    activateAfterLongPress: LONG_PRESS_MS,
    onActivate: (e) => {
      const l = latest.current;
      if (l.items.length < 2) return;
      if (clearTimer.current) clearTimeout(clearTimer.current);
      const index = indexFromOffset(e.x, e.y, l.grid);
      const start = offsetFromIndex(index, l.grid);
      drag.current = { current: index, startX: start.x, startY: start.y };
      dragX.value = start.x;
      dragY.value = start.y;
      dragKey.value = l.items[index].key;
      haptic.stick();
      l.onDragChange?.(true);
    },
    onUpdate: (e) => {
      const d = drag.current;
      const l = latest.current;
      if (d.current < 0) return;
      dragX.value = d.startX + e.translationX;
      dragY.value = d.startY + e.translationY;
      const center = {
        x: d.startX + l.grid.cellWidth / 2 + e.translationX,
        y: d.startY + l.grid.cellHeight / 2 + e.translationY,
      };
      const next = indexFromOffset(center.x, center.y, l.grid);
      if (next !== d.current) {
        l.onMove(d.current, next);
        d.current = next;
      }
    },
    onFinalize: () => {
      const d = drag.current;
      const l = latest.current;
      if (d.current < 0) return;
      const end = offsetFromIndex(d.current, l.grid);
      drag.current = { current: -1, startX: 0, startY: 0 };
      if (l.reduced) {
        dragKey.value = '';
      } else {
        dragX.value = withTiming(end.x, { duration: l.duration });
        dragY.value = withTiming(end.y, { duration: l.duration });
        clearTimer.current = setTimeout(() => {
          dragKey.value = '';
        }, l.duration + 30);
      }
      l.onDragChange?.(false);
    },
  });

  return (
    <GestureDetector gesture={pan}>
      <View accessibilityLabel="Fotos de la memoria" style={{ width, height: rows * cell }}>
        {items.map((item, index) => (
          <Cell
            key={item.key}
            item={item}
            index={index}
            count={items.length}
            grid={grid}
            gap={gap}
            dragKey={dragKey}
            dragX={dragX}
            dragY={dragY}
            onRemove={onRemove}
            onMove={onMove}
            disabled={disabled}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

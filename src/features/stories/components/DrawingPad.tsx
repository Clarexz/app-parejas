import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

import { Button, Chip, IconButton, Sheet, Text } from '@/components';
import {
  BRUSHES,
  CANVAS_H,
  CANVAS_W,
  MAX_STROKES,
  STROKE_COLORS,
  addPoint,
  simplifyStroke,
  strokePath,
  type Brush,
  type Stroke,
  type StrokeColor,
} from '@/lib/drawing';
import type { StoryBg } from '@/lib/stories';
import { useTheme } from '@/theme';

import { StrokesSvg, storyBgColor } from './StoryFrame';

type Props = {
  strokes: Stroke[];
  onChange: (strokes: Stroke[]) => void;
  bg: StoryBg;
  /** Ancho del lienzo en dp; el alto es 16/9 de eso. */
  width: number;
  /** Se llama al tocar el lienzo ya lleno (`MAX_STROKES`). */
  onLimit?: () => void;
  /** Se pinta encima del lienzo (los stickers). */
  children?: ReactNode;
};

const COLOR_NAMES: Record<StrokeColor, string> = {
  ink: 'Tinta',
  jamaica: 'Jamaica',
  cempasuchil: 'Cempasúchil',
  nopal: 'Nopal',
  chile: 'Chile',
  postit: 'Amarillo',
  paper: 'Blanco',
  tapeMint: 'Menta',
};

/** Color de trazo inicial que se ve sobre el fondo. */
function defaultColor(bg: StoryBg): StrokeColor {
  return bg === 'jamaica' || bg === 'nopal' || bg === 'ink' ? 'paper' : 'ink';
}

/**
 * Lienzo para dibujar a mano alzada (DISENO §7). El trazo en curso se pinta con un throttle por
 * cuadro; al soltar se simplifica y se agrega. Barra: 3 pinceles, colores como puntitos de tinta,
 * Deshacer y Borrar todo (con confirmación).
 */
export function DrawingPad({ strokes, onChange, bg, width, onLimit, children }: Props) {
  const { colors, spacing, radius } = useTheme();
  const height = (width * CANVAS_H) / CANVAS_W;
  const k = CANVAS_W / width;
  const [color, setColor] = useState<StrokeColor>(() => defaultColor(bg));
  const [brush, setBrush] = useState<Brush>(BRUSHES[0]);
  const [live, setLive] = useState<number[] | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Los callbacks del gesto leen lo último desde aquí (así no se recrea el gesto).
  const latest = useRef({ strokes, onChange, color, brush, onLimit, k });
  useEffect(() => {
    latest.current = { strokes, onChange, color, brush, onLimit, k };
  });
  const points = useRef<number[]>([]);
  const raf = useRef<number | null>(null);
  const blocked = useRef(false);

  const flush = useCallback(() => {
    raf.current = null;
    setLive(points.current.length ? points.current.slice() : null);
  }, []);
  const schedule = useCallback(() => {
    if (raf.current == null) raf.current = requestAnimationFrame(flush);
  }, [flush]);
  useEffect(
    () => () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 0,
    onBegin: (e) => {
      const l = latest.current;
      if (l.strokes.length >= MAX_STROKES) {
        blocked.current = true;
        l.onLimit?.();
        return;
      }
      blocked.current = false;
      points.current = addPoint([], e.x * l.k, e.y * l.k);
      schedule();
    },
    onUpdate: (e) => {
      if (blocked.current) return;
      points.current = addPoint(points.current, e.x * latest.current.k, e.y * latest.current.k);
      schedule();
    },
    onFinalize: () => {
      if (blocked.current || points.current.length === 0) return;
      const l = latest.current;
      const stroke: Stroke = {
        c: l.color,
        w: l.brush.w,
        ...(l.brush.o != null ? { o: l.brush.o } : {}),
        p: simplifyStroke(points.current),
      };
      points.current = [];
      if (raf.current != null) cancelAnimationFrame(raf.current);
      raf.current = null;
      setLive(null);
      l.onChange([...l.strokes, stroke]);
    },
  });

  const undo = () => onChange(strokes.slice(0, -1));
  const dot = 26;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ width, height, boxShadow: `0 4px 8px -3px ${colors.shadow}` }}>
        <GestureDetector gesture={pan}>
          <View
            accessibilityLabel="Lienzo para dibujar"
            style={{
              width,
              height,
              backgroundColor: storyBgColor(bg, colors),
              overflow: 'hidden',
            }}
          >
            <StrokesSvg strokes={strokes} colors={colors} width={width} />
            {live ? (
              <Svg
                style={{ position: 'absolute', left: 0, top: 0 }}
                width={width}
                height={height}
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                pointerEvents="none"
              >
                <Path
                  d={strokePath(live)}
                  stroke={colors[color]}
                  strokeOpacity={brush.o ?? 1}
                  strokeWidth={brush.w}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            ) : null}
          </View>
        </GestureDetector>
        {children}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {BRUSHES.map((b) => (
          <Chip
            key={b.id}
            label={b.label}
            color={b.id === 'highlighter' ? 'mint' : 'yellow'}
            selected={b.id === brush.id}
            onPress={() => setBrush(b)}
          />
        ))}
      </View>

      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}
      >
        {STROKE_COLORS.map((c) => {
          const selected = c === color;
          return (
            <Pressable
              key={c}
              accessibilityRole="radio"
              accessibilityLabel={`Color ${COLOR_NAMES[c]}`}
              accessibilityState={{ selected }}
              onPress={() => setColor(c)}
              style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                style={{
                  width: dot + 8,
                  height: dot + 8,
                  borderRadius: radius.pill,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.ink : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: dot,
                    height: dot,
                    borderRadius: radius.pill,
                    backgroundColor: colors[c],
                    borderWidth: 1,
                    borderColor: colors.inkMuted,
                  }}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <IconButton
          name="undo"
          accessibilityLabel="Deshacer"
          disabled={!strokes.length}
          onPress={undo}
        />
        <IconButton
          name="trash"
          accessibilityLabel="Borrar todo"
          disabled={!strokes.length}
          onPress={() => setConfirmClear(true)}
        />
      </View>

      <Sheet
        visible={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="¿Borrar todo el dibujo?"
      >
        <View style={{ gap: spacing.lg }}>
          <Text variant="body" tone="muted">
            Se van todos los trazos y no se puede deshacer.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Button
              title="Borrar todo"
              onPress={() => {
                setConfirmClear(false);
                onChange([]);
              }}
            />
            <Button title="Mejor no" variant="ghost" onPress={() => setConfirmClear(false)} />
          </View>
        </View>
      </Sheet>
    </View>
  );
}

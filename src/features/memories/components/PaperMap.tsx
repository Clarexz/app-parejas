import { useMemo, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button, Text } from '@/components';
import { clusterPoints, projectEquirect, regionForPoints } from '@/lib/geo';
import { memoryCountLabel } from '@/lib/memories';
import { useTheme } from '@/theme';

import {
  ClusterSheet,
  MapMarker,
  canSplitCluster,
  useMarkerFruit,
  type MapPoint,
} from './mapShared';

type Props = {
  points: MapPoint[];
  /** Sin esto los marcadores no son tocables (mini mapa del detalle). */
  onOpen?: (id: string) => void;
  height?: number;
  /** Mini mapa: sin textos de ayuda ni ruta. */
  compact?: boolean;
};

const PADDING = 44;
const HIT = 48;
const DEFAULT_WIDTH = 348;

/** Contornos sueltos y suaves (islas de un mapa dibujado a mano), en proporción al lienzo. */
function contours(width: number, height: number): string {
  const blob = (cx: number, cy: number, rx: number, ry: number, wobble: number) => {
    const x = cx * width;
    const y = cy * height;
    const a = rx * width;
    const b = ry * height;
    return (
      `M${x - a} ${y}` +
      `C${x - a} ${y - b * (1 + wobble)} ${x - a * 0.3} ${y - b} ${x + a * 0.2} ${y - b * 0.9}` +
      `C${x + a} ${y - b * 0.8} ${x + a * (1 + wobble)} ${y - b * 0.1} ${x + a} ${y + b * 0.3}` +
      `C${x + a * 0.9} ${y + b * 1.1} ${x + a * 0.1} ${y + b} ${x - a * 0.4} ${y + b * 0.9}` +
      `C${x - a * (1 + wobble)} ${y + b * 0.8} ${x - a} ${y + b * 0.4} ${x - a} ${y}Z`
    );
  };
  return [
    blob(0.3, 0.38, 0.34, 0.26, 0.25),
    blob(0.3, 0.38, 0.22, 0.16, 0.2),
    blob(0.74, 0.7, 0.3, 0.22, 0.3),
    blob(0.74, 0.7, 0.17, 0.12, 0.2),
  ].join('');
}

/**
 * "Mapa de papel" (sin Google Maps ni key): fondo `surface`, contornos suaves en `line`, los
 * lugares proyectados con los mismos marcadores del mapa de Google y una línea punteada que los
 * une en el orden en que pasaron. Tocar un grupo lo abre: el mapa se acerca ("Ver todo" regresa).
 */
export function PaperMap({ points, onOpen, height = 380, compact = false }: Props) {
  const { colors, spacing, radius } = useTheme();
  const markerFruit = useMarkerFruit();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [focus, setFocus] = useState<string[] | null>(null);
  const [listed, setListed] = useState<MapPoint[] | null>(null);

  const shown = useMemo(() => {
    if (!focus) return points;
    const ids = new Set(focus);
    const sub = points.filter((p) => ids.has(p.id));
    return sub.length > 0 ? sub : points;
  }, [points, focus]);

  const layout = useMemo(() => {
    const size = { width, height };
    const region = regionForPoints(shown);
    const clusters = compact ? [] : clusterPoints(shown, region, { ...size, cellPx: 56 });
    const marks = compact
      ? shown.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, items: [p] }))
      : clusters;
    const xy = projectEquirect(marks, { width, height, padding: PADDING });
    return { size, region, marks, xy };
  }, [shown, width, height, compact]);

  const route = useMemo(() => {
    if (compact || layout.marks.length < 2 || layout.marks.length > 30) return null;
    const order = layout.marks
      .map((m, i) => ({
        at: m.items.reduce(
          (min, p) => (p.memory.happened_on < min ? p.memory.happened_on : min),
          '9',
        ),
        i,
      }))
      .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    return order
      .map(
        (o, n) =>
          `${n === 0 ? 'M' : 'L'}${layout.xy[o.i].x.toFixed(1)} ${layout.xy[o.i].y.toFixed(1)}`,
      )
      .join(' ');
  }, [layout, compact]);

  const shapes = useMemo(() => contours(width, height), [width, height]);

  const open = (m: (typeof layout.marks)[number]) => {
    if (m.items.length === 1) {
      onOpen?.(m.items[0].id);
      return;
    }
    const cluster = { id: m.id, lat: m.lat, lng: m.lng, items: m.items };
    if (canSplitCluster(cluster, layout.region, layout.size)) setFocus(m.items.map((p) => p.id));
    else setListed(m.items);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        accessibilityLabel="Mapa con los lugares de sus memorias"
        onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}
        style={{
          height,
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          overflow: 'hidden',
        }}
      >
        <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Path
            d={shapes}
            stroke={colors.line}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
          />
          {route ? (
            <Path
              d={route}
              stroke={colors.inkMuted}
              strokeWidth={2}
              strokeDasharray={[2, 8]}
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
        </Svg>

        {points.length === 0 ? (
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}
          >
            <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
              Aquí van a aparecer sus lugares.
            </Text>
          </View>
        ) : (
          layout.marks.map((m, i) => {
            const count = m.items.length;
            const first = m.items[0].memory;
            const label =
              count === 1 ? `Memoria: ${first.title}` : `${memoryCountLabel(count)} en este lugar`;
            return (
              <Pressable
                key={m.id}
                disabled={!onOpen}
                onPress={() => open(m)}
                accessibilityRole={onOpen ? 'button' : 'image'}
                accessibilityLabel={label}
                accessibilityHint={
                  onOpen ? (count === 1 ? 'Toca para abrirla' : 'Toca para acercarte') : undefined
                }
                style={{
                  position: 'absolute',
                  left: layout.xy[i].x - HIT / 2,
                  top: layout.xy[i].y - HIT / 2,
                  width: HIT,
                  height: HIT,
                  zIndex: count > 1 ? 2 : 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MapMarker fruit={markerFruit(m.items)} count={count} />
              </Pressable>
            );
          })
        )}
      </View>
      {focus && !compact ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button title="Ver todo el mapa" variant="ghost" onPress={() => setFocus(null)} />
        </View>
      ) : null}
      <ClusterSheet items={listed} onClose={() => setListed(null)} onOpen={(id) => onOpen?.(id)} />
    </View>
  );
}

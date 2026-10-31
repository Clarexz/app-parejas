import { useMemo, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button, Icon, Stamp, Text } from '@/components';
import { clusterPoints, projectEquirect, regionForPoints } from '@/lib/geo';
import { memoryCountLabel } from '@/lib/memories';
import { useTheme } from '@/theme';

import { ClusterSheet, canSplitCluster, type MapPoint } from './mapShared';

type Props = {
  points: MapPoint[];
  /** Sin esto los pines no son tocables (mini mapa del detalle). */
  onOpen?: (id: string) => void;
  height?: number;
  /** Mini mapa: sin textos de ayuda ni ruta. */
  compact?: boolean;
};

const PADDING = 36;
const PIN = 28;
const HIT = 44;
const DEFAULT_WIDTH = 348;

/**
 * "Mapa de papel": una hoja cuadriculada con los lugares proyectados (sin Google Maps), pines
 * de tinta Jamaica tocables y una línea punteada que une los lugares en el orden en que pasaron.
 * Tocar un grupo de pines lo abre: la hoja se acerca a ese grupo ("Ver todo" regresa).
 */
export function PaperMap({ points, onOpen, height = 380, compact = false }: Props) {
  const { colors, spacing, shadows, page } = useTheme();
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

  const gridLines = useMemo(() => {
    let d = '';
    for (let x = page.grid; x < width; x += page.grid) d += `M${x} 0V${height}`;
    for (let y = page.grid; y < height; y += page.grid) d += `M0 ${y}H${width}`;
    return d;
  }, [width, height, page.grid]);

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
        accessibilityLabel="Mapa de papel con los lugares de sus memorias"
        onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}
        style={{
          height,
          backgroundColor: colors.paperRaised,
          borderTopWidth: 2,
          borderTopColor: colors.margin,
          boxShadow: shadows.object,
          overflow: 'hidden',
        }}
      >
        <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Path d={gridLines} stroke={colors.grid} strokeWidth={1} />
          {route ? (
            <Path
              d={route}
              stroke={colors.inkMuted}
              strokeWidth={1.5}
              strokeDasharray={[4, 6]}
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
        </Svg>

        {points.length === 0 ? (
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}
          >
            <Text variant="hand" tone="muted" style={{ textAlign: 'center' }}>
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
                  top: layout.xy[i].y - (HIT / 2 + PIN / 2 - 1),
                  width: HIT,
                  height: HIT,
                  zIndex: count > 1 ? 2 : 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="pin" size={PIN} color={colors.jamaica} />
                {count > 1 ? (
                  <Stamp
                    tone="ink"
                    rotate={-2}
                    style={{
                      position: 'absolute',
                      right: -10,
                      top: -12,
                      backgroundColor: colors.paperRaised,
                    }}
                  >
                    {String(count)}
                  </Stamp>
                ) : null}
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

import { View } from 'react-native';

import { Button, Sheet, Text } from '@/components';
import { clusterPoints, zoomInRegion, type Cluster, type LatLng, type Region } from '@/lib/geo';
import { useTheme } from '@/theme';

import type { Memory } from '../api';
import { dayMonthStamp } from '../ago';

/** Una memoria con lugar: lo que el mapa agrupa y dibuja. */
export type MapPoint = LatLng & { id: string; memory: Memory };

export type MemoriesMapProps = {
  memories: Memory[];
  onOpen: (id: string) => void;
  /** Alto del mapa en dp (por defecto lo decide cada mapa). */
  height?: number;
};

/** Memorias que tienen lat/lng, listas para agrupar. */
export function toPoints(memories: readonly Memory[]): MapPoint[] {
  const out: MapPoint[] = [];
  for (const memory of memories) {
    if (memory.lat == null || memory.lng == null) continue;
    out.push({ id: memory.id, lat: memory.lat, lng: memory.lng, memory });
  }
  return out;
}

/** Rutas de las miniaturas de la portada, para pedir sus URLs en un solo lote. */
export function coverThumbPaths(points: readonly MapPoint[], limit = 150): string[] {
  const paths: string[] = [];
  for (const p of points.slice(0, limit)) {
    const cover = p.memory.photos[0];
    if (cover) paths.push(cover.thumb_path);
  }
  return paths;
}

/** ¿Acercando el mapa a este grupo sus memorias se separan? (si no, hay que listarlas). */
export function canSplitCluster(
  cluster: Cluster<MapPoint>,
  region: Region,
  size: { width: number; height: number },
): boolean {
  const target = zoomInRegion(cluster, region);
  return clusterPoints(cluster.items, target, size).length > 1;
}

/** Lista de las memorias de un grupo que no se puede separar (mismo lugar). */
export function ClusterSheet({
  items,
  onClose,
  onOpen,
}: {
  items: MapPoint[] | null;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const { spacing } = useTheme();
  const list = items ?? [];
  return (
    <Sheet
      visible={items !== null}
      onClose={onClose}
      title={list.length === 1 ? '1 memoria aquí' : `${list.length} memorias aquí`}
    >
      <View style={{ gap: spacing.sm }}>
        {list.map((p) => (
          <View key={p.id} style={{ gap: spacing.xs }}>
            <Button
              title={p.memory.title}
              variant="ghost"
              onPress={() => {
                onClose();
                onOpen(p.id);
              }}
            />
            <Text variant="caption" tone="muted">
              {dayMonthStamp(p.memory.happened_on)}
            </Text>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

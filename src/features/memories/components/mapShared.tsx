import { View } from 'react-native';

import { Icon, ListRow, Sheet, Text } from '@/components';
import { clusterPoints, zoomInRegion, type Cluster, type LatLng, type Region } from '@/lib/geo';
import type { Fruit } from '@/lib/fruits';
import { useTheme } from '@/theme';

import type { Memory } from '../api';
import { memoryDate } from '../ago';
import { useAuthorFruit } from '../authorFruit';

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

/** Tamaños del marcador (el área de toque del contenedor es de 44 dp como mínimo). */
export const MARKER = 32;
export const CLUSTER = 40;

/**
 * Marcador del mapa (DISENO §8): círculo en la fruta de quien subió la memoria, con ícono de
 * lugar; un grupo es un círculo `ink` con el número. Anillo `bg` para separarlo del mapa.
 */
export function MapMarker({ fruit, count }: { fruit: Fruit | null; count: number }) {
  const { colors } = useTheme();
  const grouped = count > 1;
  const size = grouped ? CLUSTER : MARKER;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: grouped ? colors.ink : (fruit?.hex ?? colors.ink),
        borderWidth: 3,
        borderColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {grouped ? (
        <Text variant="ui" style={{ color: colors.bg }}>
          {String(count)}
        </Text>
      ) : (
        <Icon name="pin" size={16} color={fruit?.on ?? colors.bg} />
      )}
    </View>
  );
}

/** Fruta con la que se pinta un grupo de memorias: la de su autor si es una sola. */
export function useMarkerFruit(): (items: readonly MapPoint[]) => Fruit | null {
  const fruitOf = useAuthorFruit();
  return (items) => (items.length === 1 ? fruitOf(items[0].memory.created_by) : null);
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
      <View style={{ gap: spacing.xs }}>
        {list.map((p, i) => (
          <ListRow
            key={p.id}
            label={p.memory.title}
            value={memoryDate(p.memory.happened_on)}
            divider={i < list.length - 1}
            onPress={() => {
              onClose();
              onOpen(p.id);
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}

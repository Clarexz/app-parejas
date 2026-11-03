import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { clusterPoints, regionForPoints, zoomInRegion, type Cluster } from '@/lib/geo';
import { mapsEnabled } from '@/lib/maps';
import { memoryCountLabel } from '@/lib/memories';
import { useTheme } from '@/theme';

import { PaperMap } from './PaperMap';
import {
  ClusterSheet,
  MapMarker,
  canSplitCluster,
  toPoints,
  useMarkerFruit,
  type MapPoint,
  type MemoriesMapProps,
} from './mapShared';

/** Marcador circular: la fruta de quien subió la memoria, o `ink` con el número si es un grupo. */
function MemoryMarker({ cluster, onPress }: { cluster: Cluster<MapPoint>; onPress: () => void }) {
  const markerFruit = useMarkerFruit();
  const [track, setTrack] = useState(true);
  const count = cluster.items.length;
  // El marcador se dibuja como imagen: se deja de observar poco después de montarse.
  useEffect(() => {
    const id = setTimeout(() => setTrack(false), 600);
    return () => clearTimeout(id);
  }, []);
  const first = cluster.items[0].memory;
  return (
    <Marker
      coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={track}
      onPress={onPress}
      accessibilityLabel={count === 1 ? `Memoria: ${first.title}` : memoryCountLabel(count)}
    >
      <View style={{ padding: 4 }}>
        <MapMarker fruit={markerFruit(cluster.items)} count={count} />
      </View>
    </Marker>
  );
}

function GoogleMemoriesMap({ memories, onOpen, height }: MemoriesMapProps) {
  const { colors, radius } = useTheme();
  const window = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  const points = useMemo(() => toPoints(memories), [memories]);
  const initial = useMemo(() => regionForPoints(points), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [region, setRegion] = useState<Region>(initial);
  const [size, setSize] = useState({
    width: window.width,
    height: height ?? Math.round(window.height * 0.6),
  });
  const [listed, setListed] = useState<MapPoint[] | null>(null);

  const clusters = useMemo(() => clusterPoints(points, region, size), [points, region, size]);

  const press = (cluster: Cluster<MapPoint>) => {
    if (cluster.items.length === 1) {
      onOpen(cluster.items[0].id);
    } else if (canSplitCluster(cluster, region, size)) {
      mapRef.current?.animateToRegion(zoomInRegion(cluster, region), 400);
    } else {
      setListed(cluster.items);
    }
  };

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => {
        const { width, height: h } = e.nativeEvent.layout;
        setSize({ width: Math.round(width), height: Math.round(h) });
      }}
      style={{
        height: height ?? Math.round(window.height * 0.6),
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        overflow: 'hidden',
      }}
    >
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={initial}
        onRegionChangeComplete={setRegion}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsPointsOfInterests={false}
      >
        {clusters.map((cluster) => (
          <MemoryMarker key={cluster.id} cluster={cluster} onPress={() => press(cluster)} />
        ))}
      </MapView>
      <ClusterSheet items={listed} onClose={() => setListed(null)} onOpen={onOpen} />
    </View>
  );
}

/** Mapa de memorias: Google Maps con marcadores circulares agrupados, o el mapa de papel si no hay API key. */
export function MemoriesMap(props: MemoriesMapProps) {
  const points = useMemo(() => toPoints(props.memories), [props.memories]);
  if (!mapsEnabled()) {
    return <PaperMap points={points} onOpen={props.onOpen} height={props.height} />;
  }
  return <GoogleMemoriesMap {...props} />;
}

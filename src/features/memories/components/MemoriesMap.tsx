import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { Stamp } from '@/components';
import { clusterPoints, regionForPoints, zoomInRegion, type Cluster } from '@/lib/geo';
import { mapsEnabled } from '@/lib/maps';
import { memoryCountLabel } from '@/lib/memories';
import { useTheme } from '@/theme';

import { useMemoryPhotoUrls } from '../hooks';
import { PaperMap } from './PaperMap';
import {
  ClusterSheet,
  canSplitCluster,
  coverThumbPaths,
  toPoints,
  type MapPoint,
  type MemoriesMapProps,
} from './mapShared';

const PHOTO = 46;

/** Mini polaroid del mapa: la portada de la memoria y, si es un grupo, su contador en sello. */
function PolaroidMarker({
  cluster,
  url,
  onPress,
}: {
  cluster: Cluster<MapPoint>;
  url: string | undefined;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const [track, setTrack] = useState(true);
  const count = cluster.items.length;
  // El marcador se dibuja como imagen: se deja de observar poco después de que cargue la foto.
  useEffect(() => {
    const id = setTimeout(() => setTrack(false), url ? 600 : 2500);
    return () => clearTimeout(id);
  }, [url]);
  const first = cluster.items[0].memory;
  return (
    <Marker
      coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={track}
      onPress={onPress}
      accessibilityLabel={count === 1 ? `Memoria: ${first.title}` : memoryCountLabel(count)}
    >
      <View style={{ padding: 8 }}>
        <View
          style={{
            width: PHOTO + 8,
            backgroundColor: colors.polaroid,
            padding: 4,
            paddingBottom: 10,
            boxShadow: `0 3px 6px -2px ${colors.shadow}`,
            transform: [{ rotate: `${count % 2 === 0 ? -3 : 2}deg` }],
          }}
        >
          <View style={{ width: PHOTO, height: PHOTO, backgroundColor: colors.photoEmpty }}>
            {url ? (
              <Image
                source={{ uri: url }}
                style={{ width: PHOTO, height: PHOTO }}
                contentFit="cover"
                onLoad={() => setTimeout(() => setTrack(false), 150)}
              />
            ) : null}
          </View>
        </View>
        {count > 1 ? (
          <Stamp
            style={{
              position: 'absolute',
              right: 0,
              top: 2,
              backgroundColor: colors.polaroid,
            }}
          >
            {String(count)}
          </Stamp>
        ) : null}
      </View>
    </Marker>
  );
}

function GoogleMemoriesMap({ memories, onOpen, height }: MemoriesMapProps) {
  const { colors, shadows } = useTheme();
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
  const { urls } = useMemoryPhotoUrls(useMemo(() => coverThumbPaths(points), [points]));

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
        backgroundColor: colors.photoEmpty,
        boxShadow: shadows.object,
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
          <PolaroidMarker
            key={cluster.id}
            cluster={cluster}
            url={
              cluster.items[0].memory.photos[0]
                ? urls[cluster.items[0].memory.photos[0].thumb_path]
                : undefined
            }
            onPress={() => press(cluster)}
          />
        ))}
      </MapView>
      <ClusterSheet items={listed} onClose={() => setListed(null)} onOpen={onOpen} />
    </View>
  );
}

/** Mapa de memorias: Google Maps con miniaturas agrupadas, o el mapa de papel si no hay API key. */
export function MemoriesMap(props: MemoriesMapProps) {
  const points = useMemo(() => toPoints(props.memories), [props.memories]);
  if (!mapsEnabled()) {
    return <PaperMap points={points} onOpen={props.onOpen} height={props.height} />;
  }
  return <GoogleMemoriesMap {...props} />;
}

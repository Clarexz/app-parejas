import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { MEXICO_REGION, regionForPoints, type LatLng } from '@/lib/geo';
import { useTheme } from '@/theme';

/** Mapa a pantalla completa para elegir un lugar tocando; muestra el pin elegido. */
export function PickerMap({
  initial,
  pin,
  onPick,
}: {
  initial: LatLng | null;
  pin: LatLng | null;
  onPick: (point: LatLng) => void;
}) {
  const region = initial ? { ...regionForPoints([initial]), latitudeDelta: 0.05 } : MEXICO_REGION;
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_GOOGLE}
      initialRegion={region}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      onPress={(e) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        onPick({ lat: latitude, lng: longitude });
      }}
    >
      {pin ? <Marker coordinate={{ latitude: pin.lat, longitude: pin.lng }} /> : null}
    </MapView>
  );
}

/** Mini mapa del detalle: Google Maps en modo "lite" (imagen estática) con el pin. */
export function LiteMap({ point, height }: { point: LatLng; height: number }) {
  const { colors, shadows } = useTheme();
  return (
    <View
      style={{
        height,
        backgroundColor: colors.photoEmpty,
        boxShadow: shadows.object,
        overflow: 'hidden',
      }}
    >
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        liteMode
        scrollEnabled={false}
        zoomEnabled={false}
        toolbarEnabled={false}
        initialRegion={{
          latitude: point.lat,
          longitude: point.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Marker coordinate={{ latitude: point.lat, longitude: point.lng }} />
      </MapView>
    </View>
  );
}

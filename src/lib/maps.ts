import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * true si el APK se compiló con `GOOGLE_MAPS_API_KEY` (Google Maps disponible). En web, o sin
 * key, la app usa el "mapa de papel" propio en lugar de `MapView`.
 */
export function mapsEnabled(): boolean {
  if (Platform.OS !== 'android') return false;
  return Constants.expoConfig?.extra?.mapsEnabled === true;
}

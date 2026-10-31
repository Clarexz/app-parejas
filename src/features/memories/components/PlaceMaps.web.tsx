import type { LatLng } from '@/lib/geo';

// Web (solo QA visual): sin Google Maps. La app nunca los monta porque `mapsEnabled()` es false;
// existen para que este archivo no arrastre react-native-maps al bundle web.
export function PickerMap(_props: {
  initial: LatLng | null;
  pin: LatLng | null;
  onPick: (point: LatLng) => void;
}) {
  return null;
}

export function LiteMap(_props: { point: LatLng; height: number }) {
  return null;
}

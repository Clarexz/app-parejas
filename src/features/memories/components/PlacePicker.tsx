import { useState } from 'react';
import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, Note, Paper, Text } from '@/components';
import type { LatLng } from '@/lib/geo';
import { mapsEnabled } from '@/lib/maps';
import { useTheme } from '@/theme';

import { PickerMap } from './PlaceMaps';

type Props = {
  visible: boolean;
  /** Pin actual de la memoria (si ya tiene). */
  initial: LatLng | null;
  onConfirm: (point: LatLng) => void;
  onClose: () => void;
};

function PickerBody({ initial, onConfirm, onClose }: Omit<Props, 'visible'>) {
  const { colors, spacing, shadows, page } = useTheme();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState<LatLng | null>(initial);

  // Sin API key de Google Maps (o en web) no hay mapa: se explica y solo queda el nombre.
  if (!mapsEnabled()) {
    return (
      <View style={{ flex: 1 }}>
        <Paper />
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + spacing.md,
            paddingLeft: page.contentLeft,
            paddingRight: page.contentRight,
            gap: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -spacing.sm }}>
            <IconButton name="close" accessibilityLabel="Cerrar" onPress={onClose} />
            <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
              Elegir en el mapa
            </Text>
          </View>
          <Note tape="yellow">
            <Text variant="hand" style={{ color: colors.onPostit }}>
              El mapa llega cuando esta versión de la app se compile con la llave de Google Maps.
              Mientras, puedes escribir el nombre del lugar. Si la foto trae ubicación, la tomamos
              sola.
            </Text>
          </Note>
          <View style={{ alignItems: 'flex-start' }}>
            <Button title="Entendido" onPress={onClose} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.photoEmpty }}>
      <PickerMap initial={initial} pin={pin} onPick={setPin} />
      <View
        style={{ position: 'absolute', left: spacing.sm, top: insets.top + spacing.sm }}
        pointerEvents="box-none"
      >
        <View
          style={{
            backgroundColor: colors.paperRaised,
            borderRadius: 22,
            boxShadow: shadows.object,
          }}
        >
          <IconButton name="close" accessibilityLabel="Cerrar sin elegir" onPress={onClose} />
        </View>
      </View>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          bottom: insets.bottom + spacing.lg,
        }}
      >
        <View
          style={{
            backgroundColor: colors.paperRaised,
            borderTopWidth: 2,
            borderTopColor: colors.margin,
            padding: spacing.lg,
            gap: spacing.md,
            boxShadow: shadows.object,
          }}
        >
          <Text variant="hand" tone={pin ? undefined : 'muted'} accessibilityLiveRegion="polite">
            {pin ? 'Pin puesto. Toca otra parte para moverlo.' : 'Toca el mapa para poner el pin.'}
          </Text>
          <View style={{ alignItems: 'flex-start' }}>
            <Button title="Aquí fue" disabled={!pin} onPress={() => pin && onConfirm(pin)} />
          </View>
        </View>
      </View>
    </View>
  );
}

/** Elegir el lugar de la memoria a pantalla completa: tocar pone el pin y "Aquí fue" lo confirma. */
export function PlacePicker({ visible, initial, onConfirm, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="fullScreen"
    >
      {/* Se monta solo abierto: así cada vez arranca con el pin de la memoria. */}
      {visible ? <PickerBody initial={initial} onConfirm={onConfirm} onClose={onClose} /> : null}
    </Modal>
  );
}

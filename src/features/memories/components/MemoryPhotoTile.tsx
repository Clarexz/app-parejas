import { Image } from 'expo-image';
import { View } from 'react-native';

import { LoadingSymbol } from '@/components';
import { useTheme } from '@/theme';

type Props = {
  /** URL firmada. Mientras no llega se ve el símbolo respirando sobre `surface`. */
  url?: string;
  /** Miniatura que se ve mientras carga la foto grande. */
  placeholderUrl?: string;
  /** Ancho / alto. */
  aspectRatio: number;
  /** Ancho fijo (carrusel); sin él ocupa todo el ancho disponible. */
  width?: number;
  /** Radio de las esquinas; por defecto 24 (se pone en 0 cuando la tarjeta ya recorta). */
  radius?: number;
  label?: string;
};

/** Foto con radio 24 sobre `surface`; sin URL todavía, `LoadingSymbol` (DISENO §5 y §8). */
export function MemoryPhotoTile({
  url,
  placeholderUrl,
  aspectRatio,
  width,
  radius: corner,
  label,
}: Props) {
  const { colors, radius, motion } = useTheme();
  return (
    <View
      style={{
        width: width ?? '100%',
        aspectRatio,
        borderRadius: corner ?? radius.card,
        backgroundColor: colors.surface,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          placeholder={placeholderUrl ? { uri: placeholderUrl } : undefined}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={motion.duration.base}
          accessibilityLabel={label}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <LoadingSymbol size={32} accessibilityLabel="Cargando la foto" />
      )}
    </View>
  );
}

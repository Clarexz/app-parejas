import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

export type PolaroidSize = 'S' | 'M' | 'L';

const WIDTHS: Record<PolaroidSize, number> = { S: 104, M: 150, L: 220 };

type Props = {
  source?: ImageSourcePropType | string | { uri: string };
  /** Para formas u otro contenido en lugar de foto. */
  children?: ReactNode;
  caption?: string;
  date?: string;
  size?: PolaroidSize;
  /** @deprecated Ya no se usa. */
  tape?: 'yellow' | 'mint' | 'pink' | false;
  /** @deprecated Ya no se usa. */
  id?: string;
  /** @deprecated Ya nada se inclina. */
  tilt?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * @deprecated Bitácora: se quita al rediseñar pantallas. Ahora es una foto cuadrada de radio 24,
 * sin marco, con el pie y la fecha como texto debajo.
 */
export function Polaroid({
  source,
  children,
  caption,
  date,
  size = 'M',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: Props) {
  const { colors, spacing, radius } = useTheme();
  const width = WIDTHS[size];
  // El resultado de carga se ata a la fuente: si cambia, vuelve a "cargando".
  const [failed, setFailed] = useState<unknown>(null);
  const error = !!source && failed === source;

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={accessibilityLabel ?? caption}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        { width, alignSelf: 'flex-start', gap: spacing.xs, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <View
        style={{
          width,
          height: width,
          borderRadius: radius.card,
          backgroundColor: colors.surface2,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {children}
        {source && !error ? (
          <Image
            source={source as never}
            style={{ position: 'absolute', width, height: width }}
            contentFit="cover"
            transition={220}
            onError={() => setFailed(source)}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        {error ? (
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Icon name="photo" size={size === 'S' ? 24 : 28} color={colors.inkMuted} />
            <Text variant="note" tone="muted">
              No cargó
            </Text>
          </View>
        ) : null}
      </View>
      {caption ? (
        <Text variant="ui" numberOfLines={1} ellipsizeMode="tail">
          {caption}
        </Text>
      ) : null}
      {date ? (
        <Text variant="note" tone="muted" numberOfLines={1}>
          {date}
        </Text>
      ) : null}
    </Pressable>
  );
}

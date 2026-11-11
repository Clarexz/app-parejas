import { View } from 'react-native';

import { shareCardCopy, type ShareCardData } from '@/lib/shareCard';
import { ThemeProvider, useTheme } from '@/theme';

import { FruitDot } from './FruitDot';
import { BrandSymbol } from './Symbol';
import { Text } from './Text';
import { Wordmark } from './Wordmark';

/** Lienzo lógico de la imagen compartida (4:5, vertical). */
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

type Props = {
  data: ShareCardData;
  /** Nombres que van junto a cada fruta; sin ellos solo se dibujan las frutas. */
  meName?: string;
  partnerName?: string;
  /** Reduce el lienzo para verlo en pantalla (el lienzo sigue siendo de 1080×1350). */
  scale?: number;
};

// Medidas en unidades del lienzo (no en dp de pantalla): la imagen sale de 1080×1350 px.
const PAD = 96;
const NUMBER_SIZE = 380;

function Canvas({ data, meName, partnerName }: Omit<Props, 'scale'>) {
  const { colors, fruit } = useTheme();
  const copy = shareCardCopy(data);
  const partnerFruit = fruit.partner ?? fruit.me;
  const isPercent = copy.unit === '%';
  // El número se achica con las cifras para caber en 888 de ancho; con 4+ cifras la unidad
  // baja debajo en vez de ir al lado.
  const digits = copy.value.length;
  const numberSize = digits <= 3 ? NUMBER_SIZE : digits === 4 ? 300 : digits === 5 ? 250 : 200;
  const inline = digits <= 3;

  return (
    <View
      style={{
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        backgroundColor: colors.bg,
        padding: PAD,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark size={84} layout="name" />
        <BrandSymbol size={120} />
      </View>

      <View style={{ gap: 28 }}>
        <Text
          variant="label"
          tone="muted"
          numberOfLines={2}
          style={{ fontSize: 44, lineHeight: 56, letterSpacing: 4.4 }}
        >
          {copy.label}
        </Text>
        <View
          style={{
            flexDirection: inline ? 'row' : 'column',
            alignItems: inline ? 'flex-end' : 'flex-start',
            gap: inline ? 24 : 8,
          }}
        >
          <Text
            variant="display"
            numberOfLines={1}
            style={{
              fontSize: numberSize,
              lineHeight: numberSize * 0.95,
              letterSpacing: -numberSize * 0.03,
            }}
          >
            {copy.value}
          </Text>
          <Text
            variant="h1"
            style={{
              fontSize: isPercent ? numberSize * 0.45 : 112,
              lineHeight: isPercent ? numberSize * 0.5 : 124,
              letterSpacing: -2.5,
              paddingBottom: inline ? (isPercent ? 56 : 36) : 0,
            }}
          >
            {copy.unit}
          </Text>
        </View>
        <Text variant="body" style={{ fontSize: 56, lineHeight: 72 }} numberOfLines={3}>
          {copy.line}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 48 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, flexShrink: 1 }}>
          <FruitDot fruit={fruit.me} size={44} />
          {meName ? (
            <Text variant="ui" numberOfLines={1} style={{ fontSize: 44, lineHeight: 56 }}>
              {meName}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, flexShrink: 1 }}>
          <FruitDot fruit={partnerFruit} size={44} />
          {partnerName ? (
            <Text variant="ui" numberOfLines={1} style={{ fontSize: 44, lineHeight: 56 }}>
              {partnerName}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/**
 * Tarjeta-imagen para compartir (racha, tiempo juntos, resultado de un juego). Siempre en tema
 * claro —la imagen no depende del modo del celular—, con las frutas de la pareja. `collapsable`
 * en falso para que `captureRef` encuentre la vista en Android.
 */
export function ShareCard({ scale = 1, ...rest }: Props) {
  const width = SHARE_CARD_WIDTH * scale;
  const height = SHARE_CARD_HEIGHT * scale;
  return (
    <ThemeProvider scheme="light">
      <View style={{ width, height, overflow: 'hidden' }} collapsable={false}>
        <View
          collapsable={false}
          style={{
            width: SHARE_CARD_WIDTH,
            height: SHARE_CARD_HEIGHT,
            transform: scale === 1 ? [] : [{ scale }],
            transformOrigin: 'top left',
          }}
        >
          <Canvas {...rest} />
        </View>
      </View>
    </ThemeProvider>
  );
}

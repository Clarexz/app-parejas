import { View } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  /** Casillas pintadas. */
  value: number;
  /** Casillas en total. */
  total: number;
  /** Color de tinta con que se pintan (p. ej. `jamaica` o `nopal`). */
  tone?: 'jamaica' | 'nopal' | 'ink';
  /** Texto para lectores de pantalla, p. ej. "Tiempo de calidad: 7 de 12". */
  accessibilityLabel?: string;
};

/**
 * @deprecated Bitácora: se quita al rediseñar pantallas. Casillas redondeadas, `jamaica` = tu
 * fruta y `nopal` = la de tu pareja.
 */
export function GridScore({ value, total, tone = 'jamaica', accessibilityLabel }: Props) {
  const { colors, fruit } = useTheme();
  const fill = { jamaica: fruit.me.hex, nopal: (fruit.partner ?? fruit.me).hex, ink: colors.ink }[
    tone
  ];
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `${value} de ${total}`}
      accessibilityValue={{ min: 0, max: total, now: value }}
      style={{ flexDirection: 'row', gap: 2 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            aspectRatio: 1,
            borderRadius: 4,
            backgroundColor: i < value ? fill : colors.surface2,
          }}
        />
      ))}
    </View>
  );
}

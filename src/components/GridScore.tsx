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
 * Puntos como cuadritos de la cuadrícula del cuaderno, coloreados (DISENO §7). Reemplaza a las
 * barras de progreso: cada casilla pintada es un punto.
 */
export function GridScore({ value, total, tone = 'jamaica', accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const fill = colors[tone];
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
            backgroundColor: i < value ? fill : 'transparent',
            borderWidth: 1,
            borderColor: i < value ? fill : colors.ruled,
          }}
        />
      ))}
    </View>
  );
}

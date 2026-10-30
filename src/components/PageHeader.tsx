import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Stamp } from './Stamp';
import { Text } from './Text';

type Props = {
  /** Fecha ya formateada o folio; va en el sello. */
  stamp: string;
  title: string;
  /** Acción opcional a la derecha (un `IconButton`). */
  right?: ReactNode;
};

/** Encabezado de página: sello arriba, título `display` abajo, acción a la derecha (DISENO §8). */
export function PageHeader({ stamp, title, right }: Props) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
      <View style={{ flex: 1, gap: spacing.sm, alignItems: 'flex-start' }}>
        <Stamp>{stamp}</Stamp>
        <Text variant="display" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

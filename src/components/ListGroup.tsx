import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type Props = {
  /** Etiqueta de la sección (se pinta en MAYÚSCULAS vía `label`). */
  label?: string;
  children: ReactNode;
};

/** Agrupa `ListRow`s bajo una etiqueta; el último no lleva divisor (DISENO §7). */
export function ListGroup({ label, children }: Props) {
  const { spacing } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement) as ReactElement<{
    divider?: boolean;
  }>[];
  return (
    <View accessibilityRole="list" style={{ gap: spacing.xs }}>
      {label ? (
        <Text variant="label" tone="muted" accessibilityRole="header">
          {label}
        </Text>
      ) : null}
      <View>
        {rows.map((row, i) =>
          cloneElement(row, { divider: i < rows.length - 1 ? (row.props.divider ?? true) : false }),
        )}
      </View>
    </View>
  );
}

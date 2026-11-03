import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Card } from './Card';

type Props = {
  children: ReactNode;
  /** @deprecated Ya no se usa. */
  id?: string;
  /** @deprecated Ya nada se inclina. */
  tilt?: number;
  /** @deprecated Ya no hay cinta. */
  tape?: 'yellow' | 'mint' | 'pink' | false;
  style?: StyleProp<ViewStyle>;
};

/** @deprecated Bitácora: se quita al rediseñar pantallas (usa `Card` o `Notice`). */
export function Note({ children, style }: Props) {
  return <Card style={style}>{children}</Card>;
}

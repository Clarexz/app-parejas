import type { StyleProp, ViewStyle } from 'react-native';

export type TapeColor = 'yellow' | 'mint' | 'pink';

type Props = {
  color?: TapeColor;
  width?: number;
  height?: number;
  rotate?: number;
  style?: StyleProp<ViewStyle>;
};

/** @deprecated Bitácora: se quita al rediseñar pantallas. Ya no hay cinta: no dibuja nada. */
export function Tape(_props: Props) {
  return null;
}

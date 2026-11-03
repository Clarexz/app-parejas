import type { StyleProp, ViewStyle } from 'react-native';

export type DoodleKind = 'underline' | 'circle' | 'arrow' | 'star';

type Props = {
  kind?: DoodleKind;
  width?: number;
  height?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** @deprecated Bitácora: se quita al rediseñar pantallas. Ya no hay garabatos: no dibuja nada. */
export function Doodle(_props: Props) {
  return null;
}

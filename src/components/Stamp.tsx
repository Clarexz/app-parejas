import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';

import { Text } from './Text';

export type StampTone = 'jamaica' | 'ink' | 'nopal';

type Props = {
  children: string;
  tone?: StampTone;
  /** @deprecated Ya nada se inclina. */
  rotate?: number;
  style?: StyleProp<ViewStyle>;
};

/** @deprecated Bitácora: se quita al rediseñar pantallas (usa `Text variant="label"`). */
export function Stamp({ children, tone = 'jamaica', style }: Props) {
  return (
    <View style={[{ alignSelf: 'flex-start' }, style]}>
      <Text variant="label" tone={tone === 'nopal' ? 'success' : tone === 'ink' ? 'ink' : 'muted'}>
        {children}
      </Text>
    </View>
  );
}

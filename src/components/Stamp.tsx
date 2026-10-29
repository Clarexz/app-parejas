import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type StampTone = 'jamaica' | 'ink' | 'nopal';

type Props = {
  children: string;
  tone?: StampTone;
  /** Inclinación en grados; los sellos van a −2° por defecto (DISENO §2.6). */
  rotate?: number;
  style?: StyleProp<ViewStyle>;
};

/** Sello de fechador: Courier Prime en mayúsculas con marco de tinta (DISENO §7). */
export function Stamp({ children, tone = 'jamaica', rotate = -2, style }: Props) {
  const { colors, radius, spacing } = useTheme();
  const color = { jamaica: colors.jamaica, ink: colors.ink, nopal: colors.nopal }[tone];
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          borderWidth: 1.5,
          borderColor: color,
          borderRadius: radius.xs,
          paddingHorizontal: spacing.sm - 2,
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs - 1,
          opacity: 0.92,
          transform: [{ rotate: `${rotate}deg` }],
        },
        style,
      ]}
    >
      <Text variant="stamp" style={{ color }}>
        {children}
      </Text>
    </View>
  );
}

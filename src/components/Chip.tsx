import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

import { Text } from './Text';

export type ChipColor = 'yellow' | 'mint' | 'pink';

type Props = {
  label: string;
  color?: ChipColor;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Inclinación en grados; por defecto estable por etiqueta (±1.5° máx.). */
  tilt?: number;
  style?: StyleProp<ViewStyle>;
};

/** Etiqueta de cinta washi (DISENO §7). */
export function Chip({
  label,
  color = 'yellow',
  selected = false,
  onPress,
  disabled = false,
  tilt,
  style,
}: Props) {
  const { colors, radius, spacing } = useTheme();
  const bg = { yellow: colors.tapeYellow, mint: colors.tapeMint, pink: colors.tapePink }[color];
  const angle = tilt ?? tiltFor(label, 1) * 1.5;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      hitSlop={spacing.sm}
      style={[
        { alignSelf: 'flex-start', maxWidth: '100%', transform: [{ rotate: `${angle}deg` }] },
        style,
      ]}
    >
      {({ pressed }) => (
        <View
          style={{
            backgroundColor: bg,
            borderRadius: radius.sm,
            borderWidth: 1.5,
            borderColor: selected ? colors.ink : 'transparent',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          }}
        >
          <Text variant="handSmall" style={{ color: colors.ink }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type SegmentedOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  /** Ocupa todo el ancho y reparte las opciones por igual; si no, mide lo que dicen. */
  fullWidth?: boolean;
};

/** Píldora `surface` con opciones; la activa en `ink` (DISENO §7). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  fullWidth = false,
}: Props<T>) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        padding: spacing.xs,
        gap: 2,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={{
              flex: fullWidth ? 1 : undefined,
              minWidth: 88,
              minHeight: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.pill,
              paddingHorizontal: spacing.lg,
              backgroundColor: selected ? colors.ink : 'transparent',
            }}
          >
            <Text
              variant="ui"
              numberOfLines={1}
              style={{ color: selected ? colors.bg : colors.ink, fontSize: 14, lineHeight: 20 }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

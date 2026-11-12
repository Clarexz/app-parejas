import { View } from 'react-native';

import { Segmented, Text } from '@/components';
import { ROUND_SIZES, type RoundSize } from '@/lib/games';
import { useTheme } from '@/theme';

const OPTIONS = ROUND_SIZES.map((n) => ({ value: String(n), label: String(n) }));

/** Elige cuántas preguntas tiene la ronda: 10, 15 o 20. */
export function RoundSizePicker({
  value,
  onChange,
}: {
  value: RoundSize;
  onChange: (size: RoundSize) => void;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="muted">
        Cuántas preguntas
      </Text>
      <Segmented
        options={OPTIONS}
        value={String(value)}
        onChange={(v) => onChange(Number(v) as RoundSize)}
        accessibilityLabel="Cuántas preguntas tiene la ronda"
        fullWidth
      />
    </View>
  );
}

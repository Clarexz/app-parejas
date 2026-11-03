import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  value: string | number;
  label: string;
  icon?: IconName;
};

/** Número secundario (`num`) con su nota, sobre `surface` (DISENO §7). */
export function StatTile({ value, label, icon }: Props) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: 18,
        gap: spacing.xs,
      }}
    >
      {icon ? <Icon name={icon} size={20} /> : null}
      <Text variant="num">{value}</Text>
      <Text variant="note" tone="muted">
        {label}
      </Text>
    </View>
  );
}

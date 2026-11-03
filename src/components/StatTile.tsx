import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { useTapScale } from './motion';
import { Text } from './Text';

type Props = {
  value: string | number;
  label: string;
  icon?: IconName;
  /** Color del ícono (por defecto `ink`): tu fruta para la racha. */
  iconColor?: string;
  /** Si se pasa, la ficha es tocable y se achica al presionar. */
  onPress?: () => void;
  /** Qué pasa al tocarla (lector de pantalla). */
  accessibilityHint?: string;
};

/** Número secundario (`num`) con su nota, sobre `surface`; tocable con `onPress` (DISENO §7). */
export function StatTile({ value, label, icon, iconColor, onPress, accessibilityHint }: Props) {
  const { colors, spacing, radius } = useTheme();
  const tap = useTapScale();
  const body = (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: 18,
        gap: spacing.xs,
      }}
    >
      {icon ? <Icon name={icon} size={20} color={iconColor} /> : null}
      <Text variant="num">{value}</Text>
      <Text variant="note" tone="muted">
        {label}
      </Text>
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${value} ${label}`} style={{ flex: 1 }}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onPressIn={tap.onPressIn}
      onPressOut={tap.onPressOut}
      style={{ flex: 1 }}
    >
      <Animated.View style={[{ flex: 1 }, tap.style]}>{body}</Animated.View>
    </Pressable>
  );
}

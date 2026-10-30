import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type Props = {
  illustration?: ReactNode;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Página vacía: ilustración ligeramente inclinada, título a mano y una acción (DISENO §8). */
export function EmptyState({ illustration, title, body, actionLabel, onAction }: Props) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.xl }}>
      {illustration ? (
        <View style={{ transform: [{ rotate: '-2deg' }], marginBottom: spacing.sm }}>
          {illustration}
        </View>
      ) : null}
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {body ? (
        <Text variant="body" muted>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: 'center',
            marginTop: spacing.sm,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            variant="hand"
            tone="jamaica"
            style={{ textDecorationLine: 'underline', textDecorationColor: colors.jamaica }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

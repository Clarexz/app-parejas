import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

type Props = {
  title: string;
  /** Etiqueta arriba del título (MAYÚSCULAS vía `label`). */
  label?: string;
  /** Acción a la derecha (un `IconButton`). */
  right?: ReactNode;
  /** Muestra flecha y texto de regreso; `true` usa "Atrás". */
  back?: boolean | string;
  /** Qué hacer al volver; por defecto `router.back()`. */
  onBack?: () => void;
};

/** Título `h1` con `label` opcional arriba y acción a la derecha (DISENO §7). */
export function ScreenHeader({ title, label, right, back, onBack }: Props) {
  const { spacing } = useTheme();
  const backLabel = typeof back === 'string' ? back : 'Atrás';
  return (
    <View style={{ gap: spacing.sm }}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={onBack ?? (() => router.back())}
          hitSlop={spacing.sm}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginLeft: -spacing.xs,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="back" size={24} />
          <Text variant="ui">{backLabel}</Text>
        </Pressable>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          {label ? (
            <Text variant="label" tone="muted">
              {label}
            </Text>
          ) : null}
          <Text variant="h1" accessibilityRole="header">
            {title}
          </Text>
        </View>
        {right}
      </View>
    </View>
  );
}

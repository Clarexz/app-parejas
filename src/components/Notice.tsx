import { Children, isValidElement, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type NoticeTone = 'info' | 'danger' | 'success';

type Props = {
  tone?: NoticeTone;
  /** Texto del aviso. Siempre dice qué pasó y qué hacer. */
  children: ReactNode;
  action?: { label: string; onPress: () => void; loading?: boolean };
};

/**
 * El texto suelto (strings, números o mezclados con `Text`) va envuelto en un `Text`; así el aviso
 * acepta varias partes sin romper "Text strings must be rendered within a <Text>".
 */
function Body({ children }: { children: ReactNode }) {
  const parts = Children.toArray(children);
  const loose = parts.some((part) => !isValidElement(part));
  return loose ? <Text variant="body">{children}</Text> : <>{children}</>;
}

const ICONS: Record<NoticeTone, IconName> = { info: 'alert', danger: 'alert', success: 'check' };

/** Aviso en `surface`, radio 18: ícono + texto; `danger`/`success` colorean el ícono (DISENO §7). */
export function Notice({ tone = 'info', children, action }: Props) {
  const { colors, spacing, radius } = useTheme();
  const iconColor = { info: colors.ink, danger: colors.danger, success: colors.success }[tone];
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'danger' ? 'polite' : undefined}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ paddingTop: 1 }}>
          <Icon name={ICONS[tone]} size={24} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Body>{children}</Body>
        </View>
      </View>
      {action ? (
        <View style={{ paddingLeft: 24 + spacing.md, alignItems: 'flex-start' }}>
          <Button
            title={action.label}
            onPress={action.onPress}
            loading={action.loading}
            variant="secondary"
            size="sm"
          />
        </View>
      ) : null}
    </View>
  );
}

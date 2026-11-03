import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

type Props = {
  /** Nombre o apodo de la pareja (opcional). */
  partnerName?: string | null;
  onAccept: () => void;
  onDismiss: () => void;
};

/** Aviso previo al permiso de notificaciones: tarjeta con dos salidas (DISENO §7). */
export function SoftAskNote({ partnerName, onAccept, onDismiss }: Props) {
  const { spacing } = useTheme();
  const who = partnerName?.trim() || 'tu pareja';
  return (
    <Card tone="partner">
      <View style={{ gap: spacing.sm }}>
        <Text variant="h3">{`¿Te aviso cuando ${who} conteste?`}</Text>
        <Text variant="note" tone="muted">
          Solo lo importante, y lo puedes cambiar cuando quieras.
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginTop: spacing.xs,
          }}
        >
          <Button title="Sí, avísame" onPress={onAccept} />
          <Button title="Ahora no" variant="ghost" onPress={onDismiss} />
        </View>
      </View>
    </Card>
  );
}

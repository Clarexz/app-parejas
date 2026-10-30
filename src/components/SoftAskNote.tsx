import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Note } from './Note';
import { Text } from './Text';

type Props = {
  /** Nombre o apodo de la pareja (opcional). */
  partnerName?: string | null;
  onAccept: () => void;
  onDismiss: () => void;
};

/** Aviso previo al permiso de notificaciones: post-it con dos salidas (DISENO §7). */
export function SoftAskNote({ partnerName, onAccept, onDismiss }: Props) {
  const { colors, spacing } = useTheme();
  const who = partnerName?.trim() || 'tu pareja';
  return (
    <Note id="soft-ask" tape="mint" style={{ marginLeft: spacing.sm, maxWidth: '94%' }}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="hand" style={{ color: colors.onPostit }}>
          {`¿Te aviso cuando ${who} conteste?`}
        </Text>
        <Text variant="small" style={{ color: colors.onPostit }}>
          Solo lo importante, y lo puedes cambiar cuando quieras.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Button title="Sí, avísame" onPress={onAccept} />
          <Button title="Ahora no" variant="ghost" onPress={onDismiss} />
        </View>
      </View>
    </Note>
  );
}

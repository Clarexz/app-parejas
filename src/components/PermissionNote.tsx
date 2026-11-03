import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Icon } from './Icon';
import { Notice } from './Notice';
import { Text } from './Text';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

type Props = {
  status: PermissionStatus;
  canAskAgain: boolean;
  onRequest: () => void;
  onOpenSettings: () => void;
  loading?: boolean;
};

/**
 * Estado del permiso de avisos (DISENO §7): activos (palomita en Nopal + línea), por pedir
 * (`Notice` + botón), bloqueado (`Notice` + botón a los ajustes del celular) o solo-celular (web).
 */
export function PermissionNote({
  status,
  canAskAgain,
  onRequest,
  onOpenSettings,
  loading = false,
}: Props) {
  const { colors, spacing } = useTheme();

  if (status === 'granted') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Icon name="check" size={24} color={colors.success} />
        <Text variant="body" style={{ flex: 1 }}>
          Los avisos están activos en este celular.
        </Text>
      </View>
    );
  }

  if (status === 'unavailable') {
    return (
      <Text variant="body" tone="muted">
        Los avisos solo funcionan en el celular. Aquí puedes dejar listas tus preferencias.
      </Text>
    );
  }

  const canAsk = status === 'undetermined' || canAskAgain;
  return (
    <View style={{ gap: spacing.md, alignItems: 'flex-start' }}>
      <View style={{ alignSelf: 'stretch' }}>
        <Notice>
          {canAsk
            ? 'Para avisarte cuando tu pareja conteste, necesitamos tu permiso.'
            : 'Los avisos están apagados en este celular. Se activan en los ajustes del sistema.'}
        </Notice>
      </View>
      {canAsk ? (
        <Button title="Activar avisos" onPress={onRequest} loading={loading} />
      ) : (
        <Button title="Abrir ajustes del celular" variant="secondary" onPress={onOpenSettings} />
      )}
    </View>
  );
}

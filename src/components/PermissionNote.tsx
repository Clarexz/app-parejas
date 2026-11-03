import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Icon } from './Icon';
import { Notice } from './Notice';
import { Text } from './Text';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type PermissionKind = 'notifications' | 'location';

const COPY: Record<
  PermissionKind,
  { granted: string; unavailable: string; ask: string; blocked: string }
> = {
  notifications: {
    granted: 'Los avisos están activos en este celular.',
    unavailable:
      'Los avisos solo funcionan en el celular. Aquí puedes dejar listas tus preferencias.',
    ask: 'Para avisarte cuando tu pareja conteste, necesitamos tu permiso.',
    blocked: 'Los avisos están apagados en este celular. Se activan en los ajustes del sistema.',
  },
  location: {
    granted: 'La ubicación está activa en este celular.',
    unavailable: 'La distancia solo funciona en el celular. Ábrela desde la app para activarla.',
    ask: 'Para medir la distancia necesitamos tu permiso de ubicación.',
    blocked:
      'La ubicación está apagada para esta app. Se activa en Ajustes, Permisos, Ubicación, “Permitir solo mientras se usa la app”.',
  },
};

type Props = {
  /** Qué permiso explica (por defecto, los avisos). */
  kind?: PermissionKind;
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
  kind = 'notifications',
  status,
  canAskAgain,
  onRequest,
  onOpenSettings,
  loading = false,
}: Props) {
  const { colors, spacing } = useTheme();
  const copy = COPY[kind];

  if (status === 'granted') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Icon name="check" size={24} color={colors.success} />
        <Text variant="body" style={{ flex: 1 }}>
          {copy.granted}
        </Text>
      </View>
    );
  }

  if (status === 'unavailable') {
    return (
      <Text variant="body" tone="muted">
        {copy.unavailable}
      </Text>
    );
  }

  const canAsk = status === 'undetermined' || canAskAgain;
  return (
    <View style={{ gap: spacing.md, alignItems: 'flex-start' }}>
      <View style={{ alignSelf: 'stretch' }}>
        <Notice>{canAsk ? copy.ask : copy.blocked}</Notice>
      </View>
      {canAsk ? (
        <Button
          title={kind === 'location' ? 'Activar ubicación' : 'Activar avisos'}
          onPress={onRequest}
          loading={loading}
        />
      ) : (
        <Button title="Abrir ajustes del celular" variant="secondary" onPress={onOpenSettings} />
      )}
    </View>
  );
}

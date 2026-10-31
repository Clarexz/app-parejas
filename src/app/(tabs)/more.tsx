import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import { ListRow, Screen, Text } from '@/components';
import { useSignOut } from '@/features/auth';
import { useCouple, useLeaveCouple } from '@/features/couple';
import { errorMessage } from '@/lib/errors';
import { useTheme } from '@/theme';

export default function MoreScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { partner } = useCouple();
  const signOut = useSignOut();
  const leave = useLeaveCouple();

  const confirmSignOut = () =>
    Alert.alert('Cerrar sesión', '¿Quieres cerrar sesión en este celular?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', onPress: () => signOut.mutate() },
    ]);

  const partnerName = partner?.nickname || partner?.display_name;
  const confirmLeave = () =>
    Alert.alert(
      'Salir de la pareja',
      `${partnerName ? `Dejarás de compartir la libreta con ${partnerName}.` : 'Dejarás de compartir la libreta.'} Esto no se puede deshacer. ¿Seguro?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => leave.mutate() },
      ],
    );

  const error = signOut.error ?? leave.error;

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display" accessibilityRole="header">
          Más
        </Text>
        <View>
          <ListRow
            label="Mi perfil"
            icon="smile"
            onPress={() => router.push('/settings/profile')}
          />
          <ListRow
            label="Nuestra pareja"
            icon="calendar"
            onPress={() => router.push('/settings/couple')}
          />
          <ListRow label="Cuentas regresivas" icon="clock" onPress={() => router.push('/events')} />
          <ListRow label="Listas" icon="list" onPress={() => router.push('/lists')} />
          <ListRow label="Distancia" icon="pin" onPress={() => router.push('/distance')} />
          <ListRow label="Visitas" icon="suitcase" onPress={() => router.push('/visits')} />
          <ListRow
            label="Lenguajes del amor"
            icon="envelope"
            onPress={() => router.push('/love-languages')}
          />
          <ListRow label="Estadísticas" icon="chart" onPress={() => router.push('/stats')} />
          <ListRow
            label="Avisos"
            icon="bell"
            onPress={() => router.push('/settings/notifications')}
          />
          <ListRow label="Widgets" icon="home" onPress={() => router.push('/widgets')} />
          <ListRow
            label="Estado del servidor"
            icon="settings"
            onPress={() => router.push('/conexion')}
          />
          <ListRow label="Cerrar sesión" icon="lock" onPress={confirmSignOut} />
          <ListRow
            label="Salir de la pareja"
            tone="destructive"
            icon="close"
            onPress={confirmLeave}
            disabled={leave.isPending}
            divider={false}
          />
        </View>
        {error ? (
          <Text variant="small" tone="chile" accessibilityLiveRegion="polite">
            {errorMessage(error)}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

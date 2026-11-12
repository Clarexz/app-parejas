import { useRouter } from 'expo-router';
import { Alert, Platform, View } from 'react-native';

import {
  Avatar,
  BrandSymbol,
  Card,
  ListGroup,
  ListRow,
  Notice,
  Screen,
  ScreenHeader,
  Text,
} from '@/components';
import { AppLockOptions, AppLockRow } from '@/features/appLock';
import { useSignOut } from '@/features/auth';
import { useCouple, useFruits, useLeaveCouple } from '@/features/couple';
import { useSignedUrl } from '@/features/profile';
import { openUpdateDownload, useAppUpdate } from '@/features/updates';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

export default function MoreScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { me, partner } = useCouple();
  const fruits = useFruits();
  const avatarUrl = useSignedUrl(me?.avatar_path);
  const signOut = useSignOut();
  const leave = useLeaveCouple();
  const appUpdate = useAppUpdate();

  const checkUpdate = async () => {
    if (appUpdate.update) {
      void openUpdateDownload(appUpdate.update);
      return;
    }
    const { data, isError } = await appUpdate.refetch();
    if (isError) {
      Alert.alert('No pudimos revisar', 'Revisa tu internet y vuelve a intentar.');
    } else if (data) {
      void openUpdateDownload(data);
    } else {
      Alert.alert('Estás al día', `Ya tienes la versión más nueva (v${appUpdate.installed}).`);
    }
  };

  const myName = me?.nickname || me?.display_name || 'Tú';
  const partnerName = partner?.nickname || partner?.display_name;

  const confirmSignOut = () =>
    Alert.alert('Cerrar sesión', '¿Quieres cerrar sesión en este celular?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', onPress: () => signOut.mutate() },
    ]);

  const confirmLeave = () => {
    haptic.warning();
    Alert.alert(
      'Salir de la pareja',
      `${partnerName ? `Dejarás de compartir todo con ${partnerName}.` : 'Dejarás de compartir todo.'} Esto no se puede deshacer. ¿Seguro?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => leave.mutate() },
      ],
    );
  };

  const error = signOut.error ?? leave.error;

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader title="Más" />
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <Avatar
              name={myName}
              source={avatarUrl ?? undefined}
              size={64}
              fruit={fruits.me}
              ring
            />
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="h3" numberOfLines={1}>
                {myName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}>
                <Text variant="note" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {partnerName ? `con ${partnerName} · ` : ''}
                </Text>
                <BrandSymbol size={16} accessibilityLabel="" />
                <Text variant="note" tone="muted">
                  {fruits.me.name}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <ListGroup label="Otros ajustes">
          <ListRow
            label="Mi perfil"
            icon="person"
            onPress={() => router.push('/settings/profile')}
          />
          <ListRow label="Tu fruta" icon="fruit" onPress={() => router.push('/settings/fruit')} />
          <ListRow
            label="Nuestra pareja"
            icon="couple"
            onPress={() => router.push('/settings/couple')}
          />
          <ListRow
            label="Avisos"
            icon="bell"
            onPress={() => router.push('/settings/notifications')}
          />
          <ListRow
            label="Ubicación y distancia"
            icon="distance"
            onPress={() => router.push('/distance')}
          />
          <ListRow label="Widgets" icon="widgets" onPress={() => router.push('/widgets')} />
          <ListRow
            label="Cuentas regresivas"
            icon="countdown"
            onPress={() => router.push('/events')}
          />
          <ListRow label="Estadísticas" icon="stats" onPress={() => router.push('/stats')} />
          <ListRow
            label="Historial de preguntas"
            icon="question"
            onPress={() => router.push('/history')}
          />
          {Platform.OS === 'android' ? <AppLockRow /> : null}
        </ListGroup>
        {Platform.OS === 'android' ? <AppLockOptions /> : null}

        <ListGroup label="Cuenta">
          <ListRow
            label="Estado del servidor"
            icon="signal"
            onPress={() => router.push('/conexion')}
          />
          {Platform.OS === 'android' ? (
            <ListRow
              label={
                appUpdate.update
                  ? `Descargar la v${appUpdate.update.version}`
                  : 'Buscar versión nueva'
              }
              icon="download"
              value={appUpdate.update ? undefined : `v${appUpdate.installed ?? '?'}`}
              onPress={() => void checkUpdate()}
              disabled={appUpdate.isFetching}
            />
          ) : null}
          <ListRow label="Cerrar sesión" icon="door" onPress={confirmSignOut} />
          <ListRow
            label="Salir de la pareja"
            tone="danger"
            icon="leave"
            onPress={confirmLeave}
            disabled={leave.isPending}
          />
        </ListGroup>

        {error ? <Notice tone="danger">{errorMessage(error)}</Notice> : null}
      </View>
    </Screen>
  );
}

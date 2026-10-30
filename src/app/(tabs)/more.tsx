import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { useSignOut } from '@/features/auth';
import { useLeaveCouple } from '@/features/couple';
import { errorMessage } from '@/lib/errors';
import { useTheme } from '@/theme';

export default function MoreScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const signOut = useSignOut();
  const leave = useLeaveCouple();

  const confirmSignOut = () =>
    Alert.alert('Cerrar sesión', '¿Quieres cerrar sesión en este celular?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', onPress: () => signOut.mutate() },
    ]);

  const confirmLeave = () =>
    Alert.alert(
      'Salir de la pareja',
      'Dejarán de compartir su espacio. Esto no se puede deshacer. ¿Seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => leave.mutate() },
      ],
    );

  const error = signOut.error ?? leave.error;

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display">Más</Text>
        <Button
          title="Mi perfil"
          variant="secondary"
          onPress={() => router.push('/settings/profile')}
        />
        <Button
          title="Nuestra pareja"
          variant="secondary"
          onPress={() => router.push('/settings/couple')}
        />
        <Button
          title="Estado del servidor"
          variant="secondary"
          onPress={() => router.push('/conexion')}
        />
        {error ? (
          <Text variant="small" tone="chile">
            {errorMessage(error)}
          </Text>
        ) : null}
        <Button
          title="Cerrar sesión"
          variant="ghost"
          onPress={confirmSignOut}
          loading={signOut.isPending}
        />
        <Button
          title="Salir de la pareja"
          variant="ghost"
          onPress={confirmLeave}
          loading={leave.isPending}
        />
      </View>
    </Screen>
  );
}

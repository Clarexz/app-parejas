import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Notice, Screen, ScreenHeader, Text } from '@/components';
import { useTheme } from '@/theme';

/** Sin correo saliente no hay recuperación automática: se restablece desde el servidor. */
export default function ForgotPasswordScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          title="Olvidé mi contraseña"
          back="Entrar"
          onBack={() => router.replace('/sign-in')}
        />
        <View style={{ gap: spacing.md }}>
          <Text variant="body">
            A todos se nos olvida. ahorita no manda correos, así que no podemos mandarte un enlace.
          </Text>
          <Text variant="body">
            Pídele a quien cuida el servidor que te ponga una contraseña temporal. Sí, probablemente
            es tu pareja.
          </Text>
        </View>
        <Notice>Cuando entres, cámbiala en Más → Mi perfil.</Notice>
        <Button title="Volver a entrar" onPress={() => router.replace('/sign-in')} fullWidth />
      </View>
    </Screen>
  );
}

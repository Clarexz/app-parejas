import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Note, Screen, Text } from '@/components';
import { useTheme } from '@/theme';

/** Sin correo saliente no hay recuperación automática: se restablece desde el servidor. */
export default function ForgotPasswordScreen() {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display" accessibilityRole="header">
          Olvidé mi contraseña
        </Text>
        <Text variant="body">
          Pasa que a todos nos gana la memoria. Esta app no manda correos, así que no podemos
          mandarte un enlace.
        </Text>
        <Text variant="body">
          Pídele a quien cuida el servidor que te ponga una contraseña temporal. Sí, probablemente
          es tu pareja.
        </Text>
        <Note id="forgot-password">
          <Text variant="hand" style={{ color: colors.onPostit }}>
            Cuando entres, cámbiala en Más → Mi perfil.
          </Text>
        </Note>
        <Button title="Volver a entrar" onPress={() => router.replace('/sign-in')} fullWidth />
      </View>
    </Screen>
  );
}

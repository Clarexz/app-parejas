import { Link } from 'expo-router';
import { View } from 'react-native';

import { Screen, Text } from '@/components';
import { useTheme } from '@/theme';

/** Sin correo saliente no hay recuperación automática: se restablece desde el servidor. */
export default function ForgotPasswordScreen() {
  const { spacing } = useTheme();
  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display">Olvidé mi contraseña</Text>
        <Text variant="body">
          Por ahora la app no manda correos, así que no podemos restablecerla desde aquí. Pídele a
          quien administra el servidor que te ponga una contraseña nueva y luego entra con ella.
        </Text>
        <Link href="/sign-in">
          <Text variant="body" tone="jamaica">
            Volver a entrar
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

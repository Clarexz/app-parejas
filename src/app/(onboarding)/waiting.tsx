import { Share, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { useSignOut } from '@/features/auth';
import { useCouple, useLeaveCouple } from '@/features/couple';
import { errorMessage } from '@/lib/errors';
import { formatInviteCode } from '@/lib/validation';
import { APP_NAME } from '@/constants/app';
import { useTheme } from '@/theme';

export default function WaitingScreen() {
  const { spacing } = useTheme();
  const { couple, me } = useCouple();
  const leave = useLeaveCouple();
  const signOut = useSignOut();
  const code = couple ? formatInviteCode(couple.invite_code) : '';

  const share = () => {
    const name = me?.display_name ?? 'Tu pareja';
    void Share.share({
      message: `${name} te invita a ${APP_NAME}. Abre la app, toca "Ya tengo un código" y escribe: ${code}`,
    }).catch(() => {});
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display">Falta una persona</Text>
        <Text variant="body">Pásale este código a tu pareja para que se una:</Text>
        <Text variant="hero" selectable>
          {code}
        </Text>
        <Button title="Compartir código" onPress={share} />
        <Text variant="small" muted>
          Esta pantalla se actualiza sola cuando se una.
        </Text>
        {leave.isError || signOut.isError ? (
          <Text variant="small" tone="chile">
            {errorMessage(leave.error ?? signOut.error)}
          </Text>
        ) : null}
        <Button
          title="Cancelar y empezar de nuevo"
          variant="secondary"
          onPress={() => leave.mutate()}
          loading={leave.isPending}
        />
        <Button
          title="Cerrar sesión"
          variant="ghost"
          onPress={() => signOut.mutate()}
          loading={signOut.isPending}
        />
      </View>
    </Screen>
  );
}

import { Alert, Share, View } from 'react-native';

import { InviteCode, ListRow, Screen, Text, WaitingIllustration } from '@/components';
import { APP_NAME } from '@/constants/app';
import { useSignOut } from '@/features/auth';
import { useCouple, useLeaveCouple } from '@/features/couple';
import { errorMessage } from '@/lib/errors';
import { formatInviteCode } from '@/lib/validation';
import { useTheme } from '@/theme';

export default function WaitingScreen() {
  const { spacing } = useTheme();
  const { couple, me } = useCouple();
  const leave = useLeaveCouple();
  const signOut = useSignOut();
  const code = couple?.invite_code ?? '';

  const share = () => {
    const who = me?.nickname || me?.display_name;
    const intro = who ? `${who} te invita a ${APP_NAME}.` : `Te invitan a ${APP_NAME}.`;
    void Share.share({
      message: `${intro} Descarga la app, crea tu cuenta y escribe este código para unirte: ${formatInviteCode(code)}`,
    }).catch(() => {});
  };

  const confirmLeave = () =>
    Alert.alert(
      'Salir de esta pareja',
      'Se borra el código que compartiste y vuelves a empezar. ¿Seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => leave.mutate() },
      ],
    );

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="display" accessibilityRole="header">
            Ya casi
          </Text>
          <Text variant="body" muted>
            Falta tu pareja. Pásale este código para que se una a su libreta.
          </Text>
        </View>
        <InviteCode code={code} loading={!couple} onShare={share} />
        <View style={{ alignItems: 'flex-start', gap: spacing.sm }}>
          <WaitingIllustration />
          <Text variant="small" muted>
            Esta pantalla se actualiza sola cuando se una. No tienes que hacer nada.
          </Text>
        </View>
        {leave.isError || signOut.isError ? (
          <Text variant="small" tone="chile" accessibilityLiveRegion="polite">
            {errorMessage(leave.error ?? signOut.error)}
          </Text>
        ) : null}
        <View>
          <ListRow
            label="Cerrar sesión"
            icon="lock"
            onPress={() => signOut.mutate()}
            disabled={signOut.isPending}
          />
          <ListRow
            label="Salir de esta pareja"
            tone="destructive"
            icon="close"
            onPress={confirmLeave}
            disabled={leave.isPending}
            divider={false}
          />
        </View>
      </View>
    </Screen>
  );
}

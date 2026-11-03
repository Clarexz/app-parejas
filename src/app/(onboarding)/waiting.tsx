import { Alert, Share, View } from 'react-native';

import {
  BrandSymbol,
  InviteCode,
  ListGroup,
  ListRow,
  Notice,
  Screen,
  ScreenHeader,
  Text,
} from '@/components';
import { APP_NAME } from '@/constants/app';
import { useSignOut } from '@/features/auth';
import { useCouple, useLeaveCouple } from '@/features/couple';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
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

  const confirmLeave = () => {
    haptic.warning();
    Alert.alert(
      'Salir de esta pareja',
      'Se borra el código que compartiste y vuelves a empezar. ¿Seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => leave.mutate() },
      ],
    );
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader label="Ya casi" title="Falta tu pareja" />
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <BrandSymbol size={96} animate="breathe" accessibilityLabel="Esperando a tu pareja" />
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            Pásale este código para que se una. Esta pantalla cambia sola en cuanto llegue; no
            tienes que hacer nada.
          </Text>
        </View>
        <InviteCode code={code} loading={!couple} onShare={share} />
        {leave.isError || signOut.isError ? (
          <Notice tone="danger">{errorMessage(leave.error ?? signOut.error)}</Notice>
        ) : null}
        <ListGroup>
          <ListRow
            label="Cerrar sesión"
            icon="door"
            onPress={() => signOut.mutate()}
            disabled={signOut.isPending}
          />
          <ListRow
            label="Salir de esta pareja"
            tone="danger"
            icon="leave"
            onPress={confirmLeave}
            disabled={leave.isPending}
          />
        </ListGroup>
      </View>
    </Screen>
  );
}

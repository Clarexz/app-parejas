import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, CodeInput, Notice, Screen, ScreenHeader, Text } from '@/components';
import { useJoinCouple } from '@/features/couple';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { isValidInviteCode, normalizeInviteCode } from '@/lib/validation';
import { useTheme } from '@/theme';

export default function JoinScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const join = useJoinCouple();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    const normalized = normalizeInviteCode(code);
    if (!isValidInviteCode(normalized)) {
      setError('El código tiene 6 letras y números. Revisa que esté completo.');
      return;
    }
    setError(undefined);
    join.mutate(normalized, { onSuccess: () => haptic.success() });
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          title="Tengo un código"
          back="Su pareja"
          onBack={() => router.replace('/couple')}
        />
        <Text variant="body" tone="muted">
          Escribe el código que te pasó tu pareja. No importa si va con mayúsculas o espacios.
        </Text>
        <CodeInput
          value={code}
          onChangeText={(next) => {
            setCode(next);
            if (error) setError(undefined);
          }}
          error={error}
          autoFocus
        />
        {join.isError ? <Notice tone="danger">{errorMessage(join.error)}</Notice> : null}
        <View style={{ gap: spacing.sm, alignItems: 'center' }}>
          <Button title="Unirme" onPress={submit} loading={join.isPending} fullWidth />
          <Button
            title="Mejor lo creo yo"
            variant="ghost"
            fullWidth
            onPress={() => router.replace('/couple')}
          />
        </View>
      </View>
    </Screen>
  );
}

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, CodeInput, Screen, Text } from '@/components';
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
    join.mutate(normalized, { onSuccess: () => haptic.stamp() });
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="display" accessibilityRole="header">
            Tengo un código
          </Text>
          <Text variant="body" muted>
            Escribe el código que te pasó tu pareja. No importa si va con mayúsculas o espacios.
          </Text>
        </View>
        <CodeInput
          value={code}
          onChangeText={(next) => {
            setCode(next);
            if (error) setError(undefined);
          }}
          error={error}
          autoFocus
        />
        {join.isError ? (
          <Text variant="small" tone="chile" accessibilityLiveRegion="polite">
            {errorMessage(join.error)}
          </Text>
        ) : null}
        <Button title="Unirme" onPress={submit} loading={join.isPending} fullWidth />
        <View style={{ alignItems: 'flex-start', marginLeft: -spacing.xl }}>
          <Button
            title="Mejor creo la libreta yo"
            variant="ghost"
            onPress={() => router.replace('/couple')}
          />
        </View>
      </View>
    </Screen>
  );
}

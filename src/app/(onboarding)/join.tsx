import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { useJoinCouple } from '@/features/couple';
import { errorMessage } from '@/lib/errors';
import { isValidInviteCode, normalizeInviteCode } from '@/lib/validation';
import { useTheme } from '@/theme';

export default function JoinScreen() {
  const { spacing } = useTheme();
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
    join.mutate(normalized);
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display">Unirse</Text>
        <Input
          label="Código de su pareja"
          value={code}
          onChangeText={setCode}
          error={error}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={10}
        />
        {join.isError ? (
          <Text variant="small" tone="chile">
            {errorMessage(join.error)}
          </Text>
        ) : null}
        <Button title="Unirme" onPress={submit} loading={join.isPending} />
        <Link href="/couple">
          <Text variant="body" tone="jamaica">
            Mejor creo el espacio yo
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

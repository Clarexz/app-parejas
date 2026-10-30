import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { useSignIn } from '@/features/auth';
import { errorMessage } from '@/lib/errors';
import { validateEmail } from '@/lib/validation';
import { useTheme } from '@/theme';

export default function SignInScreen() {
  const { spacing } = useTheme();
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();

  const submit = () => {
    const invalid = validateEmail(email);
    setEmailError(invalid ?? undefined);
    if (invalid || !password) return;
    signIn.mutate({ email, password });
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display">Entrar</Text>
        <Input
          label="Correo"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Input
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
        />
        {signIn.isError ? (
          <Text variant="small" tone="chile">
            {errorMessage(signIn.error)}
          </Text>
        ) : null}
        <Button title="Entrar" onPress={submit} loading={signIn.isPending} />
        <Link href="/sign-up">
          <Text variant="body" tone="jamaica">
            Crear una cuenta
          </Text>
        </Link>
        <Link href="/forgot-password">
          <Text variant="body" tone="jamaica">
            Olvidé mi contraseña
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

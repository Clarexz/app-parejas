import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { useSignUp } from '@/features/auth';
import { errorMessage } from '@/lib/errors';
import { validateEmail, validatePassword } from '@/lib/validation';
import { useTheme } from '@/theme';

export default function SignUpScreen() {
  const { spacing } = useTheme();
  const signUp = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = () => {
    const next = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
    };
    setErrors(next);
    if (next.email || next.password) return;
    signUp.mutate({ email, password });
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display">Crear cuenta</Text>
        <Input
          label="Correo"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Input
          label="Contraseña (mínimo 8 caracteres)"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
        />
        {signUp.isError ? (
          <Text variant="small" tone="chile">
            {errorMessage(signUp.error)}
          </Text>
        ) : null}
        <Button title="Crear cuenta" onPress={submit} loading={signUp.isPending} />
        <Link href="/sign-in">
          <Text variant="body" tone="jamaica">
            Ya tengo cuenta
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

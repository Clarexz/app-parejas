import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { useSignIn } from '@/features/auth';
import { errorMessage } from '@/lib/errors';
import { validateEmail } from '@/lib/validation';
import { useTheme } from '@/theme';

export default function SignInScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = () => {
    const next = {
      email: validateEmail(email) ?? undefined,
      password: password ? undefined : 'Escribe tu contraseña.',
    };
    setErrors(next);
    if (next.email || next.password) return;
    signIn.mutate({ email, password });
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="display" accessibilityRole="header">
            Entrar
          </Text>
          <Text variant="body" muted>
            Abre la libreta donde van sus cosas.
          </Text>
        </View>
        <Input
          label="Correo"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="next"
        />
        <Input
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {signIn.isError ? (
          <Text variant="small" tone="chile" accessibilityLiveRegion="polite">
            {errorMessage(signIn.error)}
          </Text>
        ) : null}
        <Button title="Entrar" onPress={submit} loading={signIn.isPending} fullWidth />
        <View style={{ gap: spacing.xs }}>
          <Button
            title="Crear una cuenta"
            variant="secondary"
            onPress={() => router.push('/sign-up')}
            fullWidth
          />
          <View style={{ alignItems: 'flex-start', marginLeft: -spacing.xl }}>
            <Button
              title="Olvidé mi contraseña"
              variant="ghost"
              onPress={() => router.push('/forgot-password')}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

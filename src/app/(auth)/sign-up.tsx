import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { useSignUp } from '@/features/auth';
import { errorMessage } from '@/lib/errors';
import { validateEmail, validatePassword, validatePasswordConfirm } from '@/lib/validation';
import { useTheme } from '@/theme';

type Errors = { email?: string; password?: string; confirm?: string };

export default function SignUpScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const signUp = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const submit = () => {
    const next: Errors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      confirm: validatePasswordConfirm(password, confirm) ?? undefined,
    };
    setErrors(next);
    if (next.email || next.password || next.confirm) return;
    signUp.mutate({ email, password });
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="display" accessibilityRole="header">
            Crear cuenta
          </Text>
          <Text variant="body" muted>
            Solo necesitamos un correo y una contraseña. Tu nombre lo pedimos después.
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
          label="Contraseña (mínimo 8 caracteres)"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          returnKeyType="next"
        />
        <Input
          label="Repite la contraseña"
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {signUp.isError ? (
          <Text variant="small" tone="chile" accessibilityLiveRegion="polite">
            {errorMessage(signUp.error)}
          </Text>
        ) : null}
        <Button title="Crear cuenta" onPress={submit} loading={signUp.isPending} fullWidth />
        <View style={{ alignItems: 'flex-start', marginLeft: -spacing.xl }}>
          <Button
            title="Ya tengo cuenta"
            variant="ghost"
            onPress={() => router.replace('/sign-in')}
          />
        </View>
      </View>
    </Screen>
  );
}

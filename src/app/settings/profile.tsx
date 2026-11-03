import { useState } from 'react';
import { View } from 'react-native';

import {
  AvatarPicker,
  Button,
  DateField,
  Divider,
  Input,
  Notice,
  Screen,
  ScreenHeader,
  Text,
  useToast,
} from '@/components';
import { useChangePassword } from '@/features/auth';
import {
  pickImage,
  useProfile,
  useSignedUrl,
  useUpdateProfile,
  useUploadAvatar,
} from '@/features/profile';
import { isoDateToParts, optionalIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import {
  validateDisplayName,
  validateNickname,
  validatePassword,
  validatePasswordConfirm,
} from '@/lib/validation';
import { useTheme } from '@/theme';

type Errors = { name?: string; nickname?: string; birthday?: string };

export default function ProfileSettingsScreen() {
  const { spacing } = useTheme();
  const toast = useToast();
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const upload = useUploadAvatar();
  const changePassword = useChangePassword();
  const avatarUrl = useSignedUrl(profile?.avatar_path);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [birthday, setBirthday] = useState<DateParts>(isoDateToParts(profile?.birthday));
  const [errors, setErrors] = useState<Errors>({});
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<{ password?: string; confirm?: string }>({});

  const submit = () => {
    const parsed = optionalIsoDate(birthday, { notAfter: new Date() });
    const next: Errors = {
      name: validateDisplayName(name) ?? undefined,
      nickname: validateNickname(nickname) ?? undefined,
      birthday: parsed.ok ? undefined : parsed.error,
    };
    setErrors(next);
    if (next.name || next.nickname || !parsed.ok) return;
    update.mutate(
      { display_name: name.trim(), nickname: nickname.trim() || null, birthday: parsed.value },
      {
        onSuccess: () => {
          haptic.success();
          toast.show({ message: 'Listo, guardado.', tone: 'success' });
        },
        onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }),
      },
    );
  };

  const changePhoto = async () => {
    const uri = await pickImage();
    if (!uri) return;
    upload.mutate(uri, {
      onSuccess: () => toast.show({ message: 'Foto nueva guardada.', tone: 'success' }),
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }),
    });
  };

  const submitPassword = () => {
    const next = {
      password: validatePassword(password) ?? undefined,
      confirm: validatePasswordConfirm(password, confirm) ?? undefined,
    };
    setPasswordErrors(next);
    if (next.password || next.confirm) return;
    changePassword.mutate(password, {
      onSuccess: () => {
        setPassword('');
        setConfirm('');
        toast.show({ message: 'Contraseña cambiada.', tone: 'success' });
      },
    });
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader title="Mi perfil" back="Más" />
        <View style={{ alignItems: 'center' }}>
          <AvatarPicker
            name={name.trim() || '?'}
            uri={avatarUrl}
            onPick={() => void changePhoto()}
            loading={upload.isPending}
          />
        </View>
        <Input label="Tu nombre" value={name} onChangeText={setName} error={errors.name} />
        <Input
          label="Apodo (opcional)"
          value={nickname}
          onChangeText={setNickname}
          error={errors.nickname}
        />
        <DateField
          label="Tu cumpleaños (opcional)"
          value={birthday}
          onChange={setBirthday}
          error={errors.birthday}
        />
        <Button title="Guardar" onPress={submit} loading={update.isPending} fullWidth />

        <Divider />
        <Text variant="h3" accessibilityRole="header">
          Cambiar contraseña
        </Text>
        <Input
          label="Contraseña nueva (mínimo 8 caracteres)"
          value={password}
          onChangeText={setPassword}
          error={passwordErrors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
        />
        <Input
          label="Repite la contraseña nueva"
          value={confirm}
          onChangeText={setConfirm}
          error={passwordErrors.confirm}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          onSubmitEditing={submitPassword}
        />
        {changePassword.isError ? (
          <Notice tone="danger">{errorMessage(changePassword.error)}</Notice>
        ) : null}
        <Button
          title="Cambiar contraseña"
          variant="secondary"
          onPress={submitPassword}
          loading={changePassword.isPending}
          fullWidth
        />
      </View>
    </Screen>
  );
}

import { useState } from 'react';
import { View } from 'react-native';

import { AvatarPicker, Button, DateField, Input, Screen, Text, useToast } from '@/components';
import {
  pickImage,
  useProfile,
  useSignedUrl,
  useUpdateProfile,
  useUploadAvatar,
} from '@/features/profile';
import { optionalIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import { validateDisplayName, validateNickname } from '@/lib/validation';
import { useTheme } from '@/theme';

type Errors = { name?: string; nickname?: string; birthday?: string };

export default function OnboardingProfileScreen() {
  const { spacing } = useTheme();
  const toast = useToast();
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const upload = useUploadAvatar();
  const avatarUrl = useSignedUrl(profile?.avatar_path);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthday, setBirthday] = useState<DateParts>({ day: '', month: '', year: '' });
  const [errors, setErrors] = useState<Errors>({});

  const changePhoto = async () => {
    const uri = await pickImage();
    if (!uri) return;
    upload.mutate(uri, {
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
    });
  };

  const submit = () => {
    const parsed = optionalIsoDate(birthday, { notAfter: new Date() });
    const next: Errors = {
      name: validateDisplayName(name) ?? undefined,
      nickname: validateNickname(nickname) ?? undefined,
      birthday: parsed.ok ? undefined : parsed.error,
    };
    setErrors(next);
    if (next.name || next.nickname || !parsed.ok) return;
    update.mutate({
      display_name: name.trim(),
      nickname: nickname.trim() || null,
      birthday: parsed.value,
    });
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="display" accessibilityRole="header">
            ¿Cómo te llamas?
          </Text>
          <Text variant="body" muted>
            Así te van a ver en la libreta. Lo puedes cambiar cuando quieras.
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <AvatarPicker
            name={name.trim()}
            uri={avatarUrl}
            onPick={() => void changePhoto()}
            loading={upload.isPending}
          />
        </View>
        <Input
          label="Tu nombre"
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoComplete="given-name"
          returnKeyType="next"
        />
        <Input
          label="Apodo (opcional)"
          value={nickname}
          onChangeText={setNickname}
          error={errors.nickname}
          returnKeyType="next"
        />
        <DateField
          label="Tu cumpleaños (opcional)"
          value={birthday}
          onChange={setBirthday}
          error={errors.birthday}
        />
        {update.isError ? (
          <Text variant="small" tone="chile" accessibilityLiveRegion="polite">
            {errorMessage(update.error)}
          </Text>
        ) : null}
        <Button title="Seguir" onPress={submit} loading={update.isPending} fullWidth />
      </View>
    </Screen>
  );
}

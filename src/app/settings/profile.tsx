import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Button, Input, Screen, Text } from '@/components';
import {
  pickImage,
  useProfile,
  useSignedUrl,
  useUpdateProfile,
  useUploadAvatar,
} from '@/features/profile';
import { isoDateToParts, partsToIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import { validateDisplayName, validateNickname } from '@/lib/validation';
import { useTheme } from '@/theme';

export default function ProfileSettingsScreen() {
  const { spacing } = useTheme();
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const upload = useUploadAvatar();
  const avatarUrl = useSignedUrl(profile?.avatar_path);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [birthday, setBirthday] = useState<DateParts>(isoDateToParts(profile?.birthday));
  const [errors, setErrors] = useState<{ name?: string; nickname?: string; birthday?: string }>({});
  const [saved, setSaved] = useState(false);

  const submit = () => {
    setSaved(false);
    const next: typeof errors = {
      name: validateDisplayName(name) ?? undefined,
      nickname: validateNickname(nickname) ?? undefined,
    };
    let iso: string | null = null;
    if (birthday.day || birthday.month || birthday.year) {
      const parsed = partsToIsoDate(birthday, { notAfter: new Date() });
      if (parsed.ok) iso = parsed.value;
      else next.birthday = parsed.error;
    }
    setErrors(next);
    if (next.name || next.nickname || next.birthday) return;
    update.mutate(
      { display_name: name.trim(), nickname: nickname.trim() || null, birthday: iso },
      { onSuccess: () => setSaved(true) },
    );
  };

  const changePhoto = async () => {
    const uri = await pickImage();
    if (uri) upload.mutate(uri);
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display">Mi perfil</Text>
        <View style={{ alignItems: 'flex-start', gap: spacing.sm }}>
          <Avatar name={name || '?'} source={avatarUrl ?? undefined} size={96} />
          <Button
            title="Cambiar foto"
            variant="secondary"
            onPress={() => void changePhoto()}
            loading={upload.isPending}
          />
          {upload.isError ? (
            <Text variant="small" tone="chile">
              {errorMessage(upload.error)}
            </Text>
          ) : null}
        </View>
        <Input label="Tu nombre" value={name} onChangeText={setName} error={errors.name} />
        <Input
          label="Apodo (opcional)"
          value={nickname}
          onChangeText={setNickname}
          error={errors.nickname}
        />
        <Text variant="hand" muted>
          Tu cumpleaños (opcional)
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Día"
              value={birthday.day}
              onChangeText={(day) => setBirthday((b) => ({ ...b, day }))}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Mes"
              value={birthday.month}
              onChangeText={(month) => setBirthday((b) => ({ ...b, month }))}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={{ flex: 2 }}>
            <Input
              label="Año"
              value={birthday.year}
              onChangeText={(year) => setBirthday((b) => ({ ...b, year }))}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        </View>
        {errors.birthday ? (
          <Text variant="small" tone="chile">
            {errors.birthday}
          </Text>
        ) : null}
        {update.isError ? (
          <Text variant="small" tone="chile">
            {errorMessage(update.error)}
          </Text>
        ) : null}
        {saved ? (
          <Text variant="small" tone="nopal">
            Listo, guardado.
          </Text>
        ) : null}
        <Button title="Guardar" onPress={submit} loading={update.isPending} />
      </View>
    </Screen>
  );
}

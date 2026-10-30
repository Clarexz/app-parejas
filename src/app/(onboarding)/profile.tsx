import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { useUpdateProfile } from '@/features/profile';
import { partsToIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import { validateDisplayName, validateNickname } from '@/lib/validation';
import { useTheme } from '@/theme';

export default function OnboardingProfileScreen() {
  const { spacing } = useTheme();
  const update = useUpdateProfile();
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthday, setBirthday] = useState<DateParts>({ day: '', month: '', year: '' });
  const [errors, setErrors] = useState<{ name?: string; nickname?: string; birthday?: string }>({});

  const submit = () => {
    const next: typeof errors = {
      name: validateDisplayName(name) ?? undefined,
      nickname: validateNickname(nickname) ?? undefined,
    };
    let iso: string | null = null;
    const hasBirthday = birthday.day || birthday.month || birthday.year;
    if (hasBirthday) {
      const parsed = partsToIsoDate(birthday, { notAfter: new Date() });
      if (parsed.ok) iso = parsed.value;
      else next.birthday = parsed.error;
    }
    setErrors(next);
    if (next.name || next.nickname || next.birthday) return;
    update.mutate({
      display_name: name.trim(),
      nickname: nickname.trim() || null,
      birthday: iso,
    });
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display">¿Cómo te llamas?</Text>
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
        <Button title="Seguir" onPress={submit} loading={update.isPending} />
      </View>
    </Screen>
  );
}

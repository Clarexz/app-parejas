import { useState } from 'react';
import { View } from 'react-native';

import {
  AvatarPicker,
  Button,
  DateField,
  FruitPicker,
  Input,
  Notice,
  Screen,
  ScreenHeader,
  useToast,
} from '@/components';
import { useFruits } from '@/features/couple';
import {
  pickImage,
  useProfile,
  useSetFruit,
  useSignedUrl,
  useUpdateProfile,
  useUploadAvatar,
} from '@/features/profile';
import { optionalIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import { FRUITS, type FruitKey } from '@/lib/fruits';
import { haptic } from '@/lib/haptics';
import { validateDisplayName, validateNickname } from '@/lib/validation';
import { useTheme } from '@/theme';

type Errors = { name?: string; nickname?: string; birthday?: string };

/**
 * Perfil en dos pasos dentro de la misma ruta (la etapa `profile` termina al guardar el nombre):
 * 1) nombre, apodo y cumpleaños; 2) "Tu fruta". Al final se guarda todo junto.
 */
export default function OnboardingProfileScreen() {
  const { spacing } = useTheme();
  const toast = useToast();
  const { data: profile } = useProfile();
  const fruits = useFruits();
  const update = useUpdateProfile();
  const setFruit = useSetFruit();
  const upload = useUploadAvatar();
  const avatarUrl = useSignedUrl(profile?.avatar_path);
  const [step, setStep] = useState<'profile' | 'fruit'>('profile');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthday, setBirthday] = useState<DateParts>({ day: '', month: '', year: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [picked, setPicked] = useState<FruitKey | null>(null);
  const value = picked ?? fruits.me.key;

  const changePhoto = async () => {
    const uri = await pickImage();
    if (!uri) return;
    upload.mutate(uri, {
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }),
    });
  };

  const next = () => {
    const parsed = optionalIsoDate(birthday, { notAfter: new Date() });
    const found: Errors = {
      name: validateDisplayName(name) ?? undefined,
      nickname: validateNickname(nickname) ?? undefined,
      birthday: parsed.ok ? undefined : parsed.error,
    };
    setErrors(found);
    if (found.name || found.nickname || !parsed.ok) return;
    setStep('fruit');
  };

  const save = (withFruit: boolean) => {
    const parsed = optionalIsoDate(birthday, { notAfter: new Date() });
    if (!parsed.ok) return;
    const saveProfile = () =>
      update.mutate(
        {
          display_name: name.trim(),
          nickname: nickname.trim() || null,
          birthday: parsed.value,
        },
        { onSuccess: () => haptic.success() },
      );
    // La fruta va primero: al guardar el nombre la etapa cambia y esta pantalla se cierra.
    if (withFruit) setFruit.mutate(value, { onSuccess: saveProfile });
    else saveProfile();
  };

  const error = update.error ?? setFruit.error;
  const busy = update.isPending || setFruit.isPending;

  if (step === 'fruit') {
    return (
      <Screen scroll>
        <View style={{ gap: spacing.xl }}>
          <ScreenHeader
            label="Casi listo"
            title="Tu fruta"
            back="Tu perfil"
            onBack={() => setStep('profile')}
          />
          <FruitPicker value={value} partnerFruit={null} onChange={setPicked} />
          {error ? <Notice tone="danger">{errorMessage(error)}</Notice> : null}
          <View style={{ gap: spacing.sm }}>
            <Button
              title={`Quedarme con ${FRUITS[value].name}`}
              onPress={() => save(true)}
              loading={busy}
              fullWidth
            />
            <Button
              title="Elegir después"
              variant="ghost"
              fullWidth
              onPress={() => save(false)}
              disabled={busy}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader label="Tu perfil" title="¿Cómo te llamas?" />
        <View style={{ alignItems: 'center' }}>
          <AvatarPicker
            name={name.trim()}
            uri={avatarUrl}
            onPick={() => void changePhoto()}
            loading={upload.isPending}
          />
        </View>
        <View style={{ gap: spacing.lg }}>
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
        </View>
        <Button title="Seguir" onPress={next} fullWidth />
      </View>
    </Screen>
  );
}

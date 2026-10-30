import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  AvatarPicker,
  Button,
  DateField,
  Divider,
  IconButton,
  InviteCode,
  Screen,
  Text,
  useToast,
} from '@/components';
import { useCouple, useUpdateCouple, useUploadCouplePhoto } from '@/features/couple';
import { pickImage, useSignedUrl } from '@/features/profile';
import { isoDateToParts, optionalIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { detectTimeZone, timeZoneLabel } from '@/lib/timezone';
import { useTheme } from '@/theme';

export default function CoupleSettingsScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { couple } = useCouple();
  const update = useUpdateCouple();
  const upload = useUploadCouplePhoto();
  const photoUrl = useSignedUrl(couple?.photo_path);
  const [date, setDate] = useState<DateParts>(isoDateToParts(couple?.anniversary_date));
  const [dateError, setDateError] = useState<string | undefined>();

  const saved = (message: string) => {
    haptic.stamp();
    toast.show({ message, tone: 'success' });
  };
  const failed = (e: unknown) => toast.show({ message: errorMessage(e), tone: 'error' });

  const saveDate = () => {
    const parsed = optionalIsoDate(date, { notAfter: new Date() });
    if (!parsed.ok) {
      setDateError(parsed.error);
      return;
    }
    setDateError(undefined);
    update.mutate(
      { anniversary_date: parsed.value },
      { onSuccess: () => saved('Aniversario guardado.'), onError: failed },
    );
  };

  const useDeviceZone = () =>
    update.mutate(
      { timezone: detectTimeZone() },
      { onSuccess: () => saved('Zona horaria actualizada.'), onError: failed },
    );

  const changePhoto = async () => {
    const uri = await pickImage();
    if (!uri) return;
    upload.mutate(uri, {
      onSuccess: () => toast.show({ message: 'Foto nueva pegada.', tone: 'success' }),
      onError: failed,
    });
  };

  const deviceZone = detectTimeZone();
  const sameZone = couple?.timezone === deviceZone;

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
          <IconButton name="back" accessibilityLabel="Volver" onPress={() => router.back()} />
        </View>
        <Text variant="display" accessibilityRole="header">
          Nuestra pareja
        </Text>
        <View style={{ alignItems: 'center' }}>
          <AvatarPicker
            variant="couple"
            name="Nosotros"
            uri={photoUrl}
            onPick={() => void changePhoto()}
            loading={upload.isPending}
          />
        </View>

        <DateField label="Su aniversario" value={date} onChange={setDate} error={dateError} />
        <Button title="Guardar aniversario" onPress={saveDate} loading={update.isPending} />

        <Divider />
        <View style={{ gap: spacing.xs }}>
          <Text variant="small" muted>
            Zona horaria
          </Text>
          <Text variant="body">{couple ? timeZoneLabel(couple.timezone) : ''}</Text>
          <Text variant="caption" muted>
            Con ella se decide cuándo empieza cada día para ustedes dos.
          </Text>
        </View>
        <Button
          title="Usar la de este celular"
          variant="secondary"
          onPress={useDeviceZone}
          disabled={!couple || sameZone}
          loading={update.isPending}
        />

        <Divider />
        <View style={{ gap: spacing.sm }}>
          <Text variant="small" muted>
            Código de su pareja
          </Text>
          <InviteCode code={couple?.invite_code ?? ''} loading={!couple} />
        </View>
      </View>
    </Screen>
  );
}

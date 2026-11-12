import { useState } from 'react';
import { View } from 'react-native';

import {
  AvatarPicker,
  Button,
  DateField,
  Divider,
  InviteCode,
  Screen,
  ScreenHeader,
  Text,
  useToast,
} from '@/components';
import { useCouple, useUpdateCouple, useUploadCouplePhoto } from '@/features/couple';
import { SpicyOptIn } from '@/features/questions/components/SpicyOptIn';
import { pickImage, useSignedUrl } from '@/features/profile';
import { isoDateToParts, optionalIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { detectTimeZone, timeZoneLabel } from '@/lib/timezone';
import { useTheme } from '@/theme';

export default function CoupleSettingsScreen() {
  const { spacing } = useTheme();
  const toast = useToast();
  const { couple, partner } = useCouple();
  const update = useUpdateCouple();
  const upload = useUploadCouplePhoto();
  const photoUrl = useSignedUrl(couple?.photo_path);
  const [date, setDate] = useState<DateParts>(isoDateToParts(couple?.anniversary_date));
  const [dateError, setDateError] = useState<string | undefined>();

  const saved = (message: string) => {
    haptic.success();
    toast.show({ message, tone: 'success' });
  };
  const failed = (e: unknown) => toast.show({ message: errorMessage(e), tone: 'danger' });

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

  const changePhoto = async () => {
    const uri = await pickImage();
    if (!uri) return;
    upload.mutate(uri, {
      onSuccess: () => toast.show({ message: 'Foto nueva guardada.', tone: 'success' }),
      onError: failed,
    });
  };

  const partnerName = partner?.nickname || partner?.display_name || 'tu pareja';

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader title="Nuestra pareja" back="Más" />
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
        <Button
          title="Guardar aniversario"
          onPress={saveDate}
          loading={update.isPending}
          fullWidth
        />

        <Divider />
        <View style={{ gap: spacing.xs }}>
          <Text variant="ui" tone="muted">
            Zona horaria
          </Text>
          <Text variant="body">Tu zona: {timeZoneLabel(detectTimeZone())}</Text>
          <Text variant="body">
            La de {partnerName}:{' '}
            {partner?.timezone ? timeZoneLabel(partner.timezone) : 'todavía no se sabe'}
          </Text>
          <Text variant="note" tone="muted">
            El día cambia cuando es medianoche para los dos.
          </Text>
        </View>

        <Divider />
        <SpicyOptIn />

        <Divider />
        <View style={{ gap: spacing.sm }}>
          <Text variant="ui" tone="muted">
            Código de su pareja
          </Text>
          <InviteCode code={couple?.invite_code ?? ''} loading={!couple} />
        </View>
      </View>
    </Screen>
  );
}

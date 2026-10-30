import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Button, Input, Screen, Text } from '@/components';
import { useCouple, useUpdateCouple, useUploadCouplePhoto } from '@/features/couple';
import { pickImage, useSignedUrl } from '@/features/profile';
import { formatLongDate, isoDateToParts, partsToIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import { detectTimeZone, timeZoneLabel } from '@/lib/timezone';
import { formatInviteCode } from '@/lib/validation';
import { useTheme } from '@/theme';

export default function CoupleSettingsScreen() {
  const { spacing } = useTheme();
  const { couple } = useCouple();
  const update = useUpdateCouple();
  const upload = useUploadCouplePhoto();
  const photoUrl = useSignedUrl(couple?.photo_path);
  const [date, setDate] = useState<DateParts>(isoDateToParts(couple?.anniversary_date));
  const [dateError, setDateError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const saveDate = () => {
    setSaved(false);
    let iso: string | null = null;
    if (date.day || date.month || date.year) {
      const parsed = partsToIsoDate(date, { notAfter: new Date() });
      if (!parsed.ok) {
        setDateError(parsed.error);
        return;
      }
      iso = parsed.value;
    }
    setDateError(undefined);
    update.mutate({ anniversary_date: iso }, { onSuccess: () => setSaved(true) });
  };

  const useDeviceZone = () => {
    setSaved(false);
    update.mutate({ timezone: detectTimeZone() }, { onSuccess: () => setSaved(true) });
  };

  const changePhoto = async () => {
    const uri = await pickImage();
    if (uri) upload.mutate(uri);
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display">Nuestra pareja</Text>
        <Avatar variant="polaroid" name="Nosotros" source={photoUrl ?? undefined} size={120} />
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
        {couple ? (
          <Text variant="mono" muted>
            Código: {formatInviteCode(couple.invite_code)}
          </Text>
        ) : null}
        {couple?.anniversary_date ? (
          <Text variant="body">Aniversario: {formatLongDate(couple.anniversary_date)}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Día"
              value={date.day}
              onChangeText={(day) => setDate((d) => ({ ...d, day }))}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Mes"
              value={date.month}
              onChangeText={(month) => setDate((d) => ({ ...d, month }))}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={{ flex: 2 }}>
            <Input
              label="Año"
              value={date.year}
              onChangeText={(year) => setDate((d) => ({ ...d, year }))}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        </View>
        {dateError ? (
          <Text variant="small" tone="chile">
            {dateError}
          </Text>
        ) : null}
        <Button title="Guardar aniversario" onPress={saveDate} loading={update.isPending} />
        <Text variant="body">Zona horaria: {couple ? timeZoneLabel(couple.timezone) : ''}</Text>
        <Button title="Usar la de mi celular" variant="secondary" onPress={useDeviceZone} />
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
      </View>
    </Screen>
  );
}

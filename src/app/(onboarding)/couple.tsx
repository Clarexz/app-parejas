import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, DateField, Divider, Notice, Screen, ScreenHeader, Text } from '@/components';
import { useCreateCouple } from '@/features/couple';
import { optionalIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { detectTimeZone, timeZoneLabel } from '@/lib/timezone';
import { useTheme } from '@/theme';

export default function OnboardingCoupleScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const create = useCreateCouple();
  const [date, setDate] = useState<DateParts>({ day: '', month: '', year: '' });
  const [dateError, setDateError] = useState<string | undefined>();
  const timezone = detectTimeZone();

  const submit = () => {
    const parsed = optionalIsoDate(date, { notAfter: new Date() });
    if (!parsed.ok) {
      setDateError(parsed.error);
      return;
    }
    setDateError(undefined);
    create.mutate(
      { anniversaryDate: parsed.value, timezone },
      { onSuccess: () => haptic.success() },
    );
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader label="De a dos" title="Su pareja" />
        <Text variant="body" tone="muted">
          Una persona crea su espacio y la otra se une con un código.
        </Text>
        <View style={{ gap: spacing.lg }}>
          <DateField
            label="Su aniversario (opcional)"
            value={date}
            onChange={setDate}
            error={dateError}
          />
          <View style={{ gap: spacing.xs }}>
            <Text variant="ui" tone="muted">
              Zona horaria
            </Text>
            <Text variant="body">{timeZoneLabel(timezone)}</Text>
            <Text variant="note" tone="muted">
              La tomamos de este celular. Cada quien usa la suya; el día cambia cuando es medianoche
              para los dos.
            </Text>
          </View>
        </View>
        {create.isError ? <Notice tone="danger">{errorMessage(create.error)}</Notice> : null}
        <Button
          title="Crear nuestro espacio"
          onPress={submit}
          loading={create.isPending}
          fullWidth
        />
        <Divider />
        <View style={{ gap: spacing.sm }}>
          <Text variant="body" tone="muted">
            ¿Tu pareja ya lo creó y te pasó un código?
          </Text>
          <Button
            title="Tengo un código"
            variant="secondary"
            onPress={() => router.push('/join')}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}

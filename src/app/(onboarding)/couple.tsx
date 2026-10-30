import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, DateField, Divider, Screen, Text } from '@/components';
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
    create.mutate({ anniversaryDate: parsed.value, timezone }, { onSuccess: () => haptic.stamp() });
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="display" accessibilityRole="header">
            Su pareja
          </Text>
          <Text variant="body" muted>
            Una persona abre la libreta y la otra se une con un código.
          </Text>
        </View>
        <DateField
          label="Su aniversario (opcional)"
          value={date}
          onChange={setDate}
          error={dateError}
        />
        <View style={{ gap: spacing.xs }}>
          <Text variant="small" muted>
            Zona horaria
          </Text>
          <Text variant="body">{timeZoneLabel(timezone)}</Text>
          <Text variant="caption" muted>
            La tomamos de este celular. Después pueden cambiarla en Más → Nuestra pareja.
          </Text>
        </View>
        {create.isError ? (
          <Text variant="small" tone="chile" accessibilityLiveRegion="polite">
            {errorMessage(create.error)}
          </Text>
        ) : null}
        <Button
          title="Crear nuestra libreta"
          onPress={submit}
          loading={create.isPending}
          fullWidth
        />
        <Divider />
        <View style={{ gap: spacing.xs }}>
          <Text variant="body" muted>
            ¿Tu pareja ya la abrió y te pasó un código?
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

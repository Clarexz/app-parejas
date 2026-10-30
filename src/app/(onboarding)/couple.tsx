import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { useCreateCouple } from '@/features/couple';
import { partsToIsoDate, type DateParts } from '@/lib/dateParts';
import { errorMessage } from '@/lib/errors';
import { detectTimeZone } from '@/lib/timezone';
import { useTheme } from '@/theme';

export default function OnboardingCoupleScreen() {
  const { spacing } = useTheme();
  const create = useCreateCouple();
  const [date, setDate] = useState<DateParts>({ day: '', month: '', year: '' });
  const [dateError, setDateError] = useState<string | undefined>();

  const submit = () => {
    let anniversaryDate: string | null = null;
    if (date.day || date.month || date.year) {
      const parsed = partsToIsoDate(date, { notAfter: new Date() });
      if (!parsed.ok) {
        setDateError(parsed.error);
        return;
      }
      anniversaryDate = parsed.value;
    }
    setDateError(undefined);
    create.mutate({ anniversaryDate, timezone: detectTimeZone() });
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <Text variant="display">Su pareja</Text>
        <Text variant="body">
          Creen su espacio y compartan el código, o únanse con el código que les pasó su pareja.
        </Text>
        <Text variant="hand" muted>
          Su aniversario (opcional)
        </Text>
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
        {create.isError ? (
          <Text variant="small" tone="chile">
            {errorMessage(create.error)}
          </Text>
        ) : null}
        <Button title="Crear nuestro espacio" onPress={submit} loading={create.isPending} />
        <Link href="/join">
          <Text variant="body" tone="jamaica">
            Ya tengo un código
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

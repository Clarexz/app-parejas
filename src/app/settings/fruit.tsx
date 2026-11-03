import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, FruitPicker, Notice, Screen, ScreenHeader, Text } from '@/components';
import { useCouple, useFruits } from '@/features/couple';
import { useSetFruit } from '@/features/profile';
import { errorMessage } from '@/lib/errors';
import { FRUITS, isFruitKey, type FruitKey } from '@/lib/fruits';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

/** Elegir tu fruta (D100). El servidor solo bloquea la que tu pareja ELIGIÓ, no la que se ve. */
export default function FruitSettingsScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { partner } = useCouple();
  const fruits = useFruits();
  const setFruit = useSetFruit();
  const [picked, setPicked] = useState<FruitKey | null>(null);
  const value = picked ?? fruits.me.key;
  const partnerChosen = isFruitKey(partner?.fruit) ? partner.fruit : null;
  const partnerName = partner?.nickname || partner?.display_name;

  const save = () =>
    setFruit.mutate(value, {
      onSuccess: () => {
        haptic.success();
        router.back();
      },
    });

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <ScreenHeader title="Tu fruta" back="Más" />
          <Text variant="body" tone="muted">
            Es tu color en el símbolo, los widgets, tus respuestas y tus stories.
          </Text>
        </View>
        <FruitPicker
          value={value}
          partnerFruit={partnerChosen}
          partnerName={partnerName ?? undefined}
          onChange={setPicked}
        />
        {setFruit.isError ? <Notice tone="danger">{errorMessage(setFruit.error)}</Notice> : null}
        <Button
          title={`Quedarme con ${FRUITS[value].name}`}
          onPress={save}
          loading={setFruit.isPending}
          fullWidth
        />
      </View>
    </Screen>
  );
}

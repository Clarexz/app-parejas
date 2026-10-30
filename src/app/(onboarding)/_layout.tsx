import { Stack } from 'expo-router';

import { homeHrefFor, useOnboardingStage } from '@/features/onboarding';

/** Cada pantalla solo se abre en su etapa; si no, se redirige a la de la etapa actual. */
export default function OnboardingLayout() {
  const { stage } = useOnboardingStage();
  const redirectTo = homeHrefFor(stage);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={stage === 'profile'} redirectTo={redirectTo}>
        <Stack.Screen name="profile" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'couple'} redirectTo={redirectTo}>
        <Stack.Screen name="couple" />
        <Stack.Screen name="join" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'waiting'} redirectTo={redirectTo}>
        <Stack.Screen name="waiting" />
      </Stack.Protected>
    </Stack>
  );
}

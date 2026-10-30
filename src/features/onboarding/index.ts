import type { Href } from 'expo-router';

import { useSession } from '@/features/auth';
import { useCouple } from '@/features/couple';
import { useProfile } from '@/features/profile';
import { onboardingStage, type OnboardingStage } from '@/lib/onboarding';

/** Etapa actual del camino de entrada, calculada con sesión, perfil y pareja. */
export function useOnboardingStage(): {
  stage: OnboardingStage;
  retry: () => void;
} {
  const { session, isLoading: sessionLoading } = useSession();
  const profile = useProfile();
  const couple = useCouple();

  const stage = onboardingStage({
    sessionLoading,
    hasSession: !!session,
    profileLoading: profile.isLoading,
    // Solo cuenta como error si no hay perfil en caché (p. ej. sin señal al abrir).
    profileError: profile.isError && !profile.data,
    displayName: profile.data?.display_name,
    coupleLoading: couple.isLoading,
    coupleError: couple.isError,
    memberCount: couple.memberCount,
  });

  const retry = () => {
    if (profile.isError) void profile.refetch();
    void couple.refetch();
  };
  return { stage, retry };
}

/** Pantalla de inicio de cada etapa (para `redirectTo` de las rutas protegidas). */
export function homeHrefFor(stage: OnboardingStage): Href {
  switch (stage) {
    case 'signed_out':
      return '/sign-in' as Href;
    case 'profile':
      return '/profile' as Href;
    case 'couple':
      return '/couple' as Href;
    case 'waiting':
      return '/waiting' as Href;
    case 'error':
      return '/error' as Href;
    default:
      return '/' as Href;
  }
}

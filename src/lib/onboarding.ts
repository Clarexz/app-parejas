export type OnboardingStage =
  'loading' | 'error' | 'signed_out' | 'profile' | 'couple' | 'waiting' | 'ready';

export type OnboardingInput = {
  sessionLoading: boolean;
  hasSession: boolean;
  profileLoading: boolean;
  profileError: boolean;
  displayName: string | null | undefined;
  coupleLoading: boolean;
  coupleError: boolean;
  memberCount: number | null;
};

/** En qué punto del camino de entrada está la persona (decide qué rutas se pueden abrir). */
export function onboardingStage(input: OnboardingInput): OnboardingStage {
  if (input.sessionLoading) return 'loading';
  if (!input.hasSession) return 'signed_out';
  if (input.profileError) return 'error';
  if (input.profileLoading) return 'loading';
  if (!input.displayName?.trim()) return 'profile';
  if (input.coupleError) return 'error';
  if (input.coupleLoading) return 'loading';
  if (!input.memberCount) return 'couple';
  return input.memberCount >= 2 ? 'ready' : 'waiting';
}

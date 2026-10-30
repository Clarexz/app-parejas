import { useMutation } from '@tanstack/react-query';

import { signIn, signOut, signUp } from './api';
import { useSessionStore } from './store';

export function useSession() {
  const session = useSessionStore((s) => s.session);
  const isLoading = useSessionStore((s) => s.isLoading);
  return { session, user: session?.user ?? null, isLoading };
}

export function useSignIn() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signUp(email, password),
  });
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut });
}

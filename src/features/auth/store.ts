import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

type SessionState = { session: Session | null; isLoading: boolean };

export const useSessionStore = create<SessionState>(() => ({ session: null, isLoading: true }));

let initialized = false;

/** Conecta el store con supabase-js. Se llama una sola vez desde el root layout. */
export function initSessionListener(): void {
  if (initialized) return;
  initialized = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    useSessionStore.setState({ session, isLoading: false });
  });
  supabase.auth
    .getSession()
    .then(({ data }) => useSessionStore.setState({ session: data.session, isLoading: false }))
    .catch(() => useSessionStore.setState({ isLoading: false }));
}

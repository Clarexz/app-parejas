import { focusManager, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { checkServerHealth } from './health';
import { supabaseAnonKey, supabaseUrl } from './supabase';

// En nativo, "enfocar" = la app vuelve a primer plano.
function useAppFocus() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));
    return () => sub.remove();
  }, []);
}

export function useServerHealth() {
  useAppFocus();
  return useQuery({
    queryKey: ['server-health'],
    queryFn: () => checkServerHealth(supabaseUrl, supabaseAnonKey, fetch),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: 0,
  });
}

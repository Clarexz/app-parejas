import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/features/auth';
import { useCouple } from '@/features/couple';
import { distanceView, type DistanceView, type ShareMode } from '@/lib/distance';
import { randomUuid } from '@/lib/ids';
import { supabase } from '@/lib/supabase';

import { fetchLocations, type LocationRow } from './api';
import {
  applyShareMode,
  getBackgroundPermission,
  getForegroundPermission,
  isBackgroundRunning,
  isLocationSupported,
  shareNow,
  startBackground,
  type ApplyModeResult,
  type PermissionState,
} from './locationService';
import { readShareMode } from './preferences';

const NO_ROWS: LocationRow[] = [];

export const distanceKeys = {
  locations: (coupleId: string | null) => ['locations', coupleId] as const,
  mode: (userId: string | null) => ['distance-mode', userId] as const,
  permission: ['distance-permission'] as const,
};

/** Ubicaciones de la pareja, al día por Realtime (también cuando alguien deja de compartir). */
export function useLocations() {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const qc = useQueryClient();
  // Inicio, la pantalla de distancia y los widgets lo montan a la vez: un canal por montaje.
  const [suffix] = useState(() => randomUuid().slice(0, 8));
  const query = useQuery({
    queryKey: distanceKeys.locations(coupleId),
    queryFn: () => fetchLocations(coupleId as string),
    enabled: !!coupleId,
  });

  useEffect(() => {
    if (!coupleId) return;
    const invalidate = () =>
      void qc.invalidateQueries({ queryKey: distanceKeys.locations(coupleId) });
    const channel = supabase
      .channel(`locations:${coupleId}:${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations', filter: `couple_id=eq.${coupleId}` },
        invalidate,
      )
      // Los DELETE no traen el couple_id (solo la llave), así que no se pueden filtrar.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'locations' }, invalidate)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, qc, suffix]);

  return {
    rows: query.data ?? NO_ROWS,
    isLoading: !!coupleId && query.isLoading,
    // Un refresco fallido con datos en caché no es un error de pantalla completa.
    isError: query.isError && !query.data,
    refetch: query.refetch,
  };
}

export type UseDistance = DistanceView & {
  partnerName: string;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
};

/** Lo que ve la UI: km, ciudades, "hace cuánto" y quién comparte. */
export function useDistance(): UseDistance {
  const { me, partner } = useCouple();
  const { rows, isLoading, isError, refetch } = useLocations();
  const view = distanceView(rows, me?.id, partner?.id, new Date());
  return {
    ...view,
    partnerName: partner?.nickname || partner?.display_name || 'tu pareja',
    isLoading,
    isError,
    refetch,
  };
}

/** Modo de compartir guardado en este celular. */
export function useShareMode() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const query = useQuery({
    queryKey: distanceKeys.mode(userId),
    queryFn: () => readShareMode(userId),
    enabled: !!userId,
  });
  return { mode: (query.data ?? 'off') as ShareMode, isLoading: !!userId && query.isLoading };
}

export type PermissionSnapshot = { foreground: PermissionState; background: PermissionState };

/** Permisos actuales (sin pedirlos). Se relee al volver a primer plano: pudo cambiarlos en Ajustes. */
export function useLocationPermission() {
  const query = useQuery({
    queryKey: distanceKeys.permission,
    queryFn: async (): Promise<PermissionSnapshot> => {
      const [foreground, background] = await Promise.all([
        getForegroundPermission(),
        getBackgroundPermission(),
      ]);
      return { foreground, background };
    },
    enabled: isLocationSupported(),
    staleTime: 0,
  });
  const { refetch } = query;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refetch();
    });
    return () => sub.remove();
  }, [refetch]);
  // Sin dato (error o web) la pantalla lo trata como "por pedir".
  return { permission: query.data ?? null, refresh: refetch };
}

/** Activar / cambiar / apagar la distancia. El permiso se pide aquí, nunca al abrir la app. */
export function useShareLocation() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const { mode } = useShareMode();
  const { permission, refresh } = useLocationPermission();

  const mutation = useMutation<ApplyModeResult, unknown, ShareMode>({
    mutationFn: (next) => {
      if (!userId) throw new Error('sin sesión');
      return applyShareMode(userId, next);
    },
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: distanceKeys.mode(userId) }),
        qc.invalidateQueries({ queryKey: ['locations'] }),
        refresh(),
      ]);
    },
  });

  return {
    supported: isLocationSupported(),
    mode,
    permission,
    setMode: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}

/**
 * Mantiene mi ubicación al día si activé la distancia: al abrir la app y al volver a primer plano
 * manda la ubicación (con throttle). Si el modo es segundo plano y la tarea no está corriendo
 * (reinicio del celular, reinstalación), la vuelve a arrancar. No pide permisos: si ya no los
 * tiene, no hace nada (la pantalla Distancia lo explica). Móntalo en el layout raíz.
 */
export function useLocationSync(): void {
  const { user } = useSession();
  const { couple } = useCouple();
  const userId = user?.id ?? null;
  const coupleId = couple?.id ?? null;
  const running = useRef(false);

  useEffect(() => {
    if (!userId || !coupleId || !isLocationSupported()) return;
    let cancelled = false;

    const sync = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const mode = await readShareMode(userId);
        if (cancelled || mode === 'off') return;
        const fg = await getForegroundPermission();
        if (cancelled || !fg.granted) return;
        if (mode === 'background' && !(await isBackgroundRunning())) {
          const bg = await getBackgroundPermission();
          if (bg.granted) await startBackground();
        }
        await shareNow();
      } catch {
        // best effort; se reintenta al volver a primer plano
      } finally {
        running.current = false;
      }
    };

    void sync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [userId, coupleId]);
}

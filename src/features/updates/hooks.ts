import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import * as Application from 'expo-application';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

import {
  isSnoozed,
  pickUpdate,
  RELEASES_API,
  type AvailableUpdate,
  type GithubRelease,
  type Snooze,
} from '@/lib/appUpdate';

const SNOOZE_KEY = 'app-update-snooze';

async function fetchReleases(): Promise<GithubRelease[]> {
  const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub respondió ${res.status}`);
  return (await res.json()) as GithubRelease[];
}

/**
 * ¿Hay un APK más nuevo en GitHub Releases? Solo en Android (en web no hay qué instalar). Se
 * consulta al abrir la app y como mucho cada 6 h mientras siga abierta; la API pública permite 60
 * consultas por hora por IP, de sobra para dos celulares.
 */
export function useAppUpdate() {
  const installed = Application.nativeApplicationVersion;
  const query = useQuery({
    queryKey: ['app-update', installed],
    queryFn: fetchReleases,
    enabled: Platform.OS === 'android',
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
    select: (releases) => pickUpdate(installed, releases),
  });
  return { ...query, update: query.data ?? null, installed };
}

/** Abre la descarga del APK en el navegador; Android pregunta si se instala sobre la actual. */
export function openUpdateDownload(update: AvailableUpdate) {
  return Linking.openURL(update.apkUrl);
}

/** Aviso de Inicio: el update disponible, salvo que se haya pospuesto con "Luego". */
export function useUpdatePrompt() {
  const { update } = useAppUpdate();
  const [snooze, setSnooze] = useState<Snooze | null | undefined>(undefined);
  // Hora de la carga: basta para comparar con el "Luego" (que se guarda al tocarlo).
  const [now] = useState(() => Date.now());

  useEffect(() => {
    AsyncStorage.getItem(SNOOZE_KEY)
      .then((raw) => setSnooze(raw ? (JSON.parse(raw) as Snooze) : null))
      .catch(() => setSnooze(null));
  }, []);

  const later = useCallback(() => {
    if (!update) return;
    const next = { version: update.version, at: Date.now() };
    setSnooze(next);
    void AsyncStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
  }, [update]);

  const visible = !!update && snooze !== undefined && !isSnoozed(snooze, update, now);
  return { update: visible ? update : null, later };
}

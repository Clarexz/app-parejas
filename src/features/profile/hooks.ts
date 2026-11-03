import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth';

import type { FruitKey } from '@/lib/fruits';

import {
  createSignedUrl,
  fetchProfile,
  setFruit,
  updateProfile,
  uploadAvatar,
  type ProfileUpdate,
} from './api';

/** Perfil propio. */
export function useProfile() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId as string),
    enabled: !!userId,
  });
}

function requireUserId(userId: string | null): string {
  if (!userId) throw new Error('not_authenticated');
  return userId;
}

export function useUpdateProfile() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfileUpdate) => updateProfile(requireUserId(user?.id ?? null), patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['profile'] });
      void qc.invalidateQueries({ queryKey: ['couple'] });
    },
  });
}

type WithFruit = { fruit?: string | null };
type Snapshot = [readonly unknown[], unknown][];

/** Cambia `fruit` en la caché de mi perfil (['profile', id]) y de la pareja (['couple', id].me). */
function patchMyFruit(qc: ReturnType<typeof useQueryClient>, fruit: string | null) {
  qc.setQueriesData<WithFruit | null>({ queryKey: ['profile'] }, (old) =>
    old ? { ...old, fruit } : old,
  );
  qc.setQueriesData<{ me?: WithFruit | null }>({ queryKey: ['couple'] }, (old) =>
    old?.me ? { ...old, me: { ...old.me, fruit } } : old,
  );
}

/**
 * Elige tu fruta. Optimista: la pinta de inmediato y, si el servidor la rechaza (la de tu pareja o
 * una parecida), regresa a la anterior.
 */
export function useSetFruit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fruit: FruitKey) => setFruit(fruit),
    onMutate: async (fruit) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ['profile'] }),
        qc.cancelQueries({ queryKey: ['couple'] }),
      ]);
      const snapshot: Snapshot = [
        ...qc.getQueriesData({ queryKey: ['profile'] }),
        ...qc.getQueriesData({ queryKey: ['couple'] }),
      ];
      patchMyFruit(qc, fruit);
      return { snapshot };
    },
    onError: (_error, _fruit, context) => {
      context?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['profile'] });
      void qc.invalidateQueries({ queryKey: ['couple'] });
    },
  });
}

/** Recibe la URI local de la foto; la comprime, la sube y borra la anterior. */
export function useUploadAvatar() {
  const { user } = useSession();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (localUri: string) =>
      uploadAvatar(requireUserId(user?.id ?? null), localUri, profile?.avatar_path ?? null),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['profile'] });
      void qc.invalidateQueries({ queryKey: ['couple'] });
    },
  });
}

/** URL firmada de un archivo del bucket `avatars` (null si no hay ruta). */
export function useSignedUrl(path: string | null | undefined) {
  const query = useQuery({
    queryKey: ['signed-url', path ?? null],
    queryFn: () => createSignedUrl(path as string),
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
  });
  return path ? (query.data ?? null) : null;
}

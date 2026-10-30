import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth';

import {
  createSignedUrl,
  fetchProfile,
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

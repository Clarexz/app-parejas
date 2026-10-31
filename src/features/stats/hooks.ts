import { useQuery } from '@tanstack/react-query';

import { useCouple } from '@/features/couple';

import { fetchRelationshipStats } from './api';

export const statsKeys = {
  all: ['stats'] as const,
  relationship: (coupleId: string | null) => ['stats', coupleId] as const,
};

/** Estadísticas de la relación. Se piden de nuevo cada vez que se abre la pantalla. */
export function useRelationshipStats() {
  const { couple } = useCouple();
  const coupleId = couple?.id ?? null;
  const query = useQuery({
    queryKey: statsKeys.relationship(coupleId),
    queryFn: fetchRelationshipStats,
    enabled: !!coupleId,
  });
  return {
    stats: query.data ?? null,
    isLoading: !!coupleId && query.isLoading,
    // Un refresco fallido con datos en caché no es un error de pantalla completa.
    isError: query.isError && !query.data,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

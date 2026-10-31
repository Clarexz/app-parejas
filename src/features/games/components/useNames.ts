import { useCouple } from '@/features/couple';

/** Nombres para el copy: el mío ("Tú" si no hay apodo) y el de mi pareja. */
export function useNames() {
  const { me, partner, members } = useCouple();
  return {
    meId: me?.id ?? '',
    meName: me?.nickname || me?.display_name || 'Tú',
    partnerName: partner?.nickname || partner?.display_name || 'Tu pareja',
    members,
  };
}

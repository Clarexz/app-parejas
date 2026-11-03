import { useCouple } from '@/features/couple';
import { FRUITS } from '@/lib/fruits';
import { useTheme } from '@/theme';

/** Nombres para el copy (el mío, "Tú" si no hay apodo, y el de mi pareja) y las frutas de cada quien. */
export function useNames() {
  const { me, partner, members } = useCouple();
  const { fruit } = useTheme();
  return {
    meId: me?.id ?? '',
    meName: me?.nickname || me?.display_name || 'Tú',
    partnerName: partner?.nickname || partner?.display_name || 'Tu pareja',
    members,
    meFruit: fruit.me,
    partnerFruit: fruit.partner ?? FRUITS.mango,
  };
}

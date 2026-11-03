import { useCallback } from 'react';

import { useCouple, useFruits } from '@/features/couple';
import type { Fruit } from '@/lib/fruits';

/**
 * Fruta de quien subió algo: la tuya si fuiste tú, la de tu pareja si fue ella o él
 * (DISENO §1: la fruta solo dice quién es quién).
 */
export function useAuthorFruit(): (userId: string) => Fruit | null {
  const { me } = useCouple();
  const fruits = useFruits();
  const meId = me?.id;
  return useCallback(
    (userId: string) => (userId === meId ? fruits.me : fruits.partner),
    [meId, fruits.me, fruits.partner],
  );
}

import { FRUITS, type Fruit } from '@/lib/fruits';
import { useTheme } from '@/theme';

/** Tu fruta y la de tu pareja (con una de respaldo si todavía no hay pareja). */
export function usePairFruits(): { me: Fruit; partner: Fruit } {
  const { fruit } = useTheme();
  return { me: fruit.me, partner: fruit.partner ?? FRUITS.mango };
}

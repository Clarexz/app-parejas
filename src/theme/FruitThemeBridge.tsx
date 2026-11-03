import type { ReactNode } from 'react';

import { useCouple } from '@/features/couple';
import { resolveFruits } from '@/lib/fruits';

import { ThemeProvider } from './index';

/**
 * Lee a ustedes dos (perfil y pareja) y pasa sus frutas efectivas al tema. Va dentro del
 * `QueryProvider`. Sin sesión o sin pareja, `resolveFruits` cae a Sandía para ti.
 */
export function FruitThemeBridge({ children }: { children: ReactNode }) {
  const { me, partner } = useCouple();
  // `fruit` llega en otra tarea (columna nueva de profiles): se lee de forma defensiva.
  const fruitOf = (profile: object | null) => (profile as { fruit?: string | null } | null)?.fruit;
  const fruits = me
    ? resolveFruits(
        { id: me.id, fruit: fruitOf(me) },
        partner ? { id: partner.id, fruit: fruitOf(partner) } : null,
      )
    : undefined;
  return <ThemeProvider fruits={fruits}>{children}</ThemeProvider>;
}

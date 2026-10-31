import { useEffect, useRef } from 'react';

import { useToast } from '@/components/Toast';
import { useCouple } from '@/features/couple';

import { useActiveStories, useStoriesRealtime } from '../hooks';

/**
 * Se monta UNA vez en el layout raíz: Realtime de stories y un `Toast` cuando tu pareja pega una
 * nueva con la app abierta (sin banner de push en primer plano).
 */
export function StoriesEvents() {
  useStoriesRealtime();
  const { partner } = useCouple();
  const toast = useToast();
  const { stories, isLoading } = useActiveStories();
  const partnerId = partner?.id ?? null;
  const name = partner?.nickname || partner?.display_name || 'Tu pareja';
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!partnerId || isLoading) return;
    const ids = new Set(stories.filter((s) => s.user_id === partnerId).map((s) => s.id));
    // La primera lectura solo registra lo que ya había: el aviso es para las que llegan después.
    if (known.current && [...ids].some((id) => !known.current?.has(id))) {
      toast.show({ message: `${name} pegó una story.` });
    }
    known.current = ids;
  }, [stories, isLoading, partnerId, name, toast]);

  return null;
}

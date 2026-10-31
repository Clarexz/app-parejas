import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useCouple } from '@/features/couple';
import { useLocations } from '@/features/distance';
import { useEvents } from '@/features/events';
import { useMoods } from '@/features/mood';
import { useActiveStories } from '@/features/stories';
import { snapshotDistance } from '@/lib/distance';
import type { OnboardingStage } from '@/lib/onboarding';
import {
  buildWidgetSnapshot,
  emptyWidgetSnapshot,
  latestActiveStory,
  type WidgetSnapshot,
} from '@/lib/widgets';
import { pickPartnerStory } from '@/widgets/partnerStory';
import { readSnapshot } from '@/widgets/storage';
import { refreshWidgets, saveAndRefresh } from '@/widgets/update';

const DEBOUNCE_MS = 800;

/**
 * Mantiene el snapshot de los widgets al día con lo que ve la app: guarda y redibuja (con un
 * debounce corto) cuando cambia la pareja, los perfiles, el mood o la story de tu pareja; sin pareja o sin
 * sesión guarda un snapshot vacío. Al volver a primer plano redibuja siempre, para que los días
 * (que se derivan de la fecha) se pongan al corriente aunque no haya datos nuevos.
 */
export function useWidgetSync(stage: OnboardingStage): void {
  const { couple, me, partner } = useCouple();
  const { latestByUser } = useMoods();
  const { stories, isLoading: storiesLoading, isError: storiesError } = useActiveStories();
  const { events, isLoading: eventsLoading, isError: eventsError } = useEvents();
  const { rows: locations, isLoading: locationsLoading, isError: locationsError } = useLocations();
  const latest = useRef<WidgetSnapshot | null>(null);

  const mood = (partner && latestByUser[partner.id]) || null;
  const ready = stage === 'ready';
  // Mientras las stories no cargan se conserva la story del snapshot anterior (no se borra).
  const storiesPending = storiesLoading || storiesError;
  const partnerStory = partner ? latestActiveStory(stories, partner.id, new Date()) : null;
  // Igual que las stories: mientras eventos o ubicaciones no cargan se conserva lo anterior.
  const eventsPending = eventsLoading || eventsError;
  const locationsPending = locationsLoading || locationsError;
  const distance = locationsPending
    ? null
    : snapshotDistance(locations, me?.id ?? null, partner?.id ?? null);

  const key = JSON.stringify([
    stage,
    couple?.anniversary_date ?? null,
    couple?.timezone ?? null,
    me?.nickname || me?.display_name || null,
    me?.birthday ?? null,
    partner?.nickname || partner?.display_name || null,
    partner?.birthday ?? null,
    mood ? [mood.id, mood.emoji, mood.note, mood.created_at] : null,
    partner?.id ?? null,
    storiesPending,
    partnerStory ? [partnerStory.id, partnerStory.expires_at, partnerStory.deleted_at] : null,
    eventsPending,
    eventsPending
      ? null
      : events.map((e) => [e.id, e.kind, e.title, e.emoji, e.date, e.recurring_yearly]),
    locationsPending,
    distance,
  ]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        let snapshot: WidgetSnapshot | null = null;
        if (ready && couple) {
          const previous = await readSnapshot();
          const story = storiesPending
            ? null
            : await pickPartnerStory(stories, partner?.id, previous);
          snapshot = buildWidgetSnapshot({
            anniversary: couple.anniversary_date,
            timezone: couple.timezone,
            me: me ? { name: me.nickname || me.display_name, birthday: me.birthday } : null,
            partner: partner
              ? { name: partner.nickname || partner.display_name, birthday: partner.birthday }
              : null,
            partnerMood: mood,
            partnerId: partner?.id ?? null,
            partnerStory: story,
            events: eventsPending ? (previous?.events ?? []) : events,
            distance: locationsPending ? (previous?.distance ?? null) : distance,
          });
          if (storiesPending && previous?.partnerStory) {
            snapshot = { ...snapshot, partnerStory: previous.partnerStory };
          }
        } else if (stage === 'couple' || stage === 'waiting') {
          snapshot = emptyWidgetSnapshot('no_couple');
        } else if (stage === 'signed_out') {
          snapshot = emptyWidgetSnapshot('signed_out');
        }
        if (cancelled) return;
        latest.current = snapshot;
        if (snapshot) await saveAndRefresh(snapshot);
      })();
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `key` resume todas las entradas; el resto cambia de identidad sin cambiar de contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && latest.current) void refreshWidgets(latest.current);
    });
    return () => sub.remove();
  }, []);
}

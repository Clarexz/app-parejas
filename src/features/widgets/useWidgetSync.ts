import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useCouple } from '@/features/couple';
import { useMoods } from '@/features/mood';
import type { OnboardingStage } from '@/lib/onboarding';
import { buildWidgetSnapshot, emptyWidgetSnapshot, type WidgetSnapshot } from '@/lib/widgets';
import { refreshWidgets, saveAndRefresh } from '@/widgets/update';

const DEBOUNCE_MS = 800;

/**
 * Mantiene el snapshot de los widgets al día con lo que ve la app: guarda y redibuja (con un
 * debounce corto) cuando cambia la pareja, los perfiles o el mood de tu pareja; sin pareja o sin
 * sesión guarda un snapshot vacío. Al volver a primer plano redibuja siempre, para que los días
 * (que se derivan de la fecha) se pongan al corriente aunque no haya datos nuevos.
 */
export function useWidgetSync(stage: OnboardingStage): void {
  const { couple, me, partner } = useCouple();
  const { latestByUser } = useMoods();
  const latest = useRef<WidgetSnapshot | null>(null);

  const mood = (partner && latestByUser[partner.id]) || null;
  const ready = stage === 'ready';

  const key = JSON.stringify([
    stage,
    couple?.anniversary_date ?? null,
    couple?.timezone ?? null,
    me?.nickname || me?.display_name || null,
    me?.birthday ?? null,
    partner?.nickname || partner?.display_name || null,
    partner?.birthday ?? null,
    mood ? [mood.id, mood.emoji, mood.note, mood.created_at] : null,
  ]);

  useEffect(() => {
    let snapshot: WidgetSnapshot | null = null;
    if (ready && couple) {
      snapshot = buildWidgetSnapshot({
        anniversary: couple.anniversary_date,
        timezone: couple.timezone,
        me: me ? { name: me.nickname || me.display_name, birthday: me.birthday } : null,
        partner: partner
          ? { name: partner.nickname || partner.display_name, birthday: partner.birthday }
          : null,
        partnerMood: mood,
      });
    } else if (stage === 'couple' || stage === 'waiting') {
      snapshot = emptyWidgetSnapshot('no_couple');
    } else if (stage === 'signed_out') {
      snapshot = emptyWidgetSnapshot('signed_out');
    }
    latest.current = snapshot;
    if (!snapshot) return;
    const timer = setTimeout(() => void saveAndRefresh(snapshot), DEBOUNCE_MS);
    return () => clearTimeout(timer);
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

import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { useCouple } from '@/features/couple';
import { cardState, type CardState } from '@/lib/questions';

import { useCelebrationStore } from '../celebration';
import { useDailyQuestion, useQuestionsRealtime, useStreak } from '../hooks';
import { Celebration } from './Celebration';

/**
 * Avisos de preguntas en toda la app (se monta UNA vez en el layout raíz): Realtime con toasts,
 * y la celebración de "día completo" cuando se pide o cuando la pareja completa el día.
 */
export function QuestionsEvents() {
  const { couple, partner } = useCouple();
  const toast = useToast();
  const name = partner?.nickname || partner?.display_name || 'Tu pareja';
  const { card } = useDailyQuestion();
  const { refetch: refetchStreak, streak } = useStreak();
  const nonce = useCelebrationStore((s) => s.nonce);
  const celebrate = useCelebrationStore((s) => s.celebrate);
  const [shown, setShown] = useState<{ streak: number | null } | null>(null);

  useQuestionsRealtime(couple?.id ?? null, {
    onNudge: () => toast.show({ message: `${name} te está esperando para la pregunta de hoy.` }),
    onPartnerAnswered: () => toast.show({ message: `${name} ya contestó y la dobló.` }),
  });

  // La pareja completa el día: yo ya había contestado (waiting) y ahora están los dos.
  const prevState = useRef<CardState | null>(null);
  const stateNow = card ? cardState(card) : null;
  useEffect(() => {
    if (prevState.current === 'waiting' && stateNow === 'both') celebrate();
    prevState.current = stateNow;
  }, [stateNow, celebrate]);

  // Al pedirse la celebración se trae la racha nueva antes de mostrarla.
  const lastNonce = useRef(nonce);
  const streakRef = useRef(streak);
  useEffect(() => {
    streakRef.current = streak;
  });
  useEffect(() => {
    if (nonce === lastNonce.current) return;
    lastNonce.current = nonce;
    let cancelled = false;
    void (async () => {
      let current = streakRef.current?.current ?? null;
      try {
        const result = (await refetchStreak()) as { data?: { current: number } };
        current = result.data?.current ?? current;
      } catch {
        // se celebra igual, sin número
      }
      if (!cancelled) setShown({ streak: current });
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce, refetchStreak]);

  const close = useCallback(() => setShown(null), []);
  return shown ? <Celebration streak={shown.streak} onClose={close} /> : null;
}

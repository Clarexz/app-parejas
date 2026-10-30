import type { OnboardingStage } from '@/lib/onboarding';

import { useWidgetSync } from './useWidgetSync';

/** Sin UI: solo mantiene sincronizados los widgets de la pantalla de inicio. */
export function WidgetsBridge({ stage }: { stage: OnboardingStage }) {
  useWidgetSync(stage);
  return null;
}

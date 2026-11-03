import { ArrivalOverlay } from '@/components';
import { pluralDays } from '@/lib/questionCopy';

type Props = {
  /** Racha nueva (días); null si no se pudo saber. */
  streak: number | null;
  onClose: () => void;
};

/**
 * "Día completo" (DISENO §5): la rendija. Las dos mitades llegan, háptica success (la pone
 * `ArrivalOverlay`) y una frase con la racha. Se cierra sola o al tocar.
 */
export function Celebration({ streak, onClose }: Props) {
  const text =
    streak && streak > 0
      ? `Ya están los dos. Llevan ${pluralDays(streak)} seguidos.`
      : 'Ya están los dos.';
  return <ArrivalOverlay text={text} onDone={onClose} />;
}

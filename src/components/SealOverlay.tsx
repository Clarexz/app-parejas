import { ArrivalOverlay } from './ArrivalOverlay';

type Props = { label?: string };

/** @deprecated Bitácora: se quita al rediseñar pantallas (usa `ArrivalOverlay`). */
export function SealOverlay({ label = 'Listo' }: Props) {
  // Los textos viejos venían en MAYÚSCULAS de sello ("PEGADA"): la frase va en minúscula inicial.
  const text = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  return <ArrivalOverlay text={text} />;
}

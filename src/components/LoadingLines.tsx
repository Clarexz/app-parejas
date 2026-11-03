import { LoadingSymbol } from './LoadingSymbol';

type Props = { count?: number; accessibilityLabel?: string };

/** @deprecated Bitácora: se quita al rediseñar pantallas (usa `LoadingSymbol`). */
export function LoadingLines({ accessibilityLabel = 'Cargando' }: Props) {
  return <LoadingSymbol size={48} accessibilityLabel={accessibilityLabel} />;
}

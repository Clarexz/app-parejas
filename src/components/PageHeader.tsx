import type { ReactNode } from 'react';

import { ScreenHeader } from './ScreenHeader';

type Props = {
  /** Antes era el texto del sello; ahora va como `label`. */
  stamp: string;
  title: string;
  right?: ReactNode;
};

/** @deprecated Bitácora: se quita al rediseñar pantallas (usa `ScreenHeader`). */
export function PageHeader({ stamp, title, right }: Props) {
  return <ScreenHeader label={stamp} title={title} right={right} />;
}

import { useMemo } from 'react';

import { PaperMap } from './PaperMap';
import { toPoints, type MemoriesMapProps } from './mapShared';

// Web (solo QA visual): siempre el mapa de papel; este archivo no importa react-native-maps.
export function MemoriesMap({ memories, onOpen, height }: MemoriesMapProps) {
  const points = useMemo(() => toPoints(memories), [memories]);
  return <PaperMap points={points} onOpen={onOpen} height={height} />;
}

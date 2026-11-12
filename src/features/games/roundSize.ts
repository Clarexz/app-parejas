// Último tamaño de ronda elegido por juego (10, 15 o 20), solo en este celular.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_ROUND_SIZE, parseRoundSize, type GameId, type RoundSize } from '@/lib/games';

const KEY = 'games:round-size:v1';

async function readAll(): Promise<Record<string, unknown>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function readRoundSize(game: GameId): Promise<RoundSize | null> {
  return parseRoundSize((await readAll())[game]);
}

export async function writeRoundSize(game: GameId, size: RoundSize): Promise<void> {
  try {
    const all = await readAll();
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...all, [game]: size }));
  } catch {
    // Sin almacenamiento: la elección vale solo para esta vez.
  }
}

/**
 * Tamaño de ronda elegido para un juego: parte de `fallback` (10 por defecto), usa el último que
 * se guardó en el celular y lo vuelve a guardar al cambiarlo.
 */
export function useRoundSize(game: GameId | null, fallback: RoundSize = DEFAULT_ROUND_SIZE) {
  const [size, setSizeState] = useState<RoundSize>(fallback);
  useEffect(() => {
    if (!game) return;
    let alive = true;
    void readRoundSize(game).then((stored) => {
      if (alive) setSizeState(stored ?? fallback);
    });
    return () => {
      alive = false;
    };
  }, [game, fallback]);
  const setSize = useCallback(
    (next: RoundSize) => {
      setSizeState(next);
      if (game) void writeRoundSize(game, next);
    },
    [game],
  );
  return [size, setSize] as const;
}

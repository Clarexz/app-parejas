// Sistema de frutas de "ahorita" (docs/DISENO.md §3, manual de marca §06). Cada quien elige su
// fruta: es su color en el símbolo, los widgets, sus respuestas y sus stories. Funciones puras;
// la misma regla vive en SQL (`private.effective_fruit`, `public.set_fruit`) y en los widgets.

export const FRUIT_KEYS = [
  'sandia',
  'mango',
  'mandarina',
  'limon',
  'uva',
  'arandano',
  'pitaya',
] as const;

export type FruitKey = (typeof FRUIT_KEYS)[number];

export type Fruit = {
  key: FruitKey;
  name: string;
  /** Color de la fruta (igual en claro y oscuro). */
  hex: string;
  /** Color del texto o ícono encima de la fruta (Tinta u Hueso, según contraste del manual). */
  on: string;
  /** Fruta que mejor le queda a la pareja. */
  suggested: FruitKey;
};

const INK = '#1B1B1F';
const BONE = '#FFFDF8';

export const FRUITS: Record<FruitKey, Fruit> = {
  sandia: { key: 'sandia', name: 'Sandía', hex: '#F2495C', on: INK, suggested: 'mango' },
  mango: { key: 'mango', name: 'Mango', hex: '#FFC24B', on: INK, suggested: 'sandia' },
  mandarina: { key: 'mandarina', name: 'Mandarina', hex: '#FF8A3D', on: INK, suggested: 'uva' },
  limon: { key: 'limon', name: 'Limón', hex: '#C5DC3A', on: INK, suggested: 'pitaya' },
  uva: { key: 'uva', name: 'Uva', hex: '#8B5CF6', on: BONE, suggested: 'limon' },
  arandano: { key: 'arandano', name: 'Arándano', hex: '#3F6BFF', on: BONE, suggested: 'mandarina' },
  pitaya: { key: 'pitaya', name: 'Pitaya', hex: '#E83E9C', on: INK, suggested: 'limon' },
};

/** Pares que se bloquean por parecerse (manual §06). El orden no importa. */
export const BLOCKED_PAIRS: readonly (readonly [FruitKey, FruitKey])[] = [
  ['sandia', 'pitaya'],
  ['sandia', 'mandarina'],
  ['mango', 'limon'],
  ['mango', 'mandarina'],
  ['uva', 'arandano'],
  ['uva', 'pitaya'],
];

/** Pareja por defecto: Sandía para quien tenga el id menor, Mango para el otro. */
export const DEFAULT_FRUITS: readonly [FruitKey, FruitKey] = ['sandia', 'mango'];

export function isFruitKey(value: unknown): value is FruitKey {
  return typeof value === 'string' && (FRUIT_KEYS as readonly string[]).includes(value);
}

export type FruitClash = 'same' | 'similar';

/** Si dos frutas no pueden convivir en una pareja: la misma, o un par que se parece. */
export function fruitClash(a: FruitKey, b: FruitKey): FruitClash | null {
  if (a === b) return 'same';
  return BLOCKED_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
    ? 'similar'
    : null;
}

export type FruitPerson = { id: string; fruit: string | null | undefined };

/**
 * Frutas que se ven de verdad para cada miembro. Reglas (deterministas en los dos celulares):
 * 1. Sin pareja: tu fruta, o Sandía si no has elegido.
 * 2. Ninguno eligió: Sandía para el id menor, Mango para el mayor.
 * 3. Solo uno eligió: el otro toma la sugerida de esa fruta.
 * 4. Los dos eligieron y chocan (pasa al volver a emparejarse): el id menor se queda con la suya
 *    y el mayor toma la sugerida.
 */
export function resolveFruits(
  me: FruitPerson,
  partner: FruitPerson | null | undefined,
): { me: FruitKey; partner: FruitKey | null } {
  const mine = isFruitKey(me.fruit) ? me.fruit : null;
  if (!partner) return { me: mine ?? DEFAULT_FRUITS[0], partner: null };
  const theirs = isFruitKey(partner.fruit) ? partner.fruit : null;
  const meFirst = me.id < partner.id;

  if (!mine && !theirs) {
    return meFirst
      ? { me: DEFAULT_FRUITS[0], partner: DEFAULT_FRUITS[1] }
      : { me: DEFAULT_FRUITS[1], partner: DEFAULT_FRUITS[0] };
  }
  if (mine && !theirs) return { me: mine, partner: FRUITS[mine].suggested };
  if (!mine && theirs) return { me: FRUITS[theirs].suggested, partner: theirs };

  const a = mine as FruitKey;
  const b = theirs as FruitKey;
  if (!fruitClash(a, b)) return { me: a, partner: b };
  return meFirst
    ? { me: a, partner: FRUITS[a].suggested }
    : { me: FRUITS[b].suggested, partner: b };
}

export type FruitOption = {
  fruit: Fruit;
  /** Por qué no se puede elegir: es la de tu pareja o se le parece. */
  blocked: FruitClash | null;
  suggested: boolean;
};

/** Opciones del selector, en el orden del manual, según la fruta (efectiva) de tu pareja. */
export function fruitOptions(partnerFruit: FruitKey | null): FruitOption[] {
  return FRUIT_KEYS.map((key) => ({
    fruit: FRUITS[key],
    blocked: partnerFruit ? fruitClash(key, partnerFruit) : null,
    suggested: partnerFruit ? FRUITS[partnerFruit].suggested === key : false,
  }));
}

/** Mezcla un color de fruta sobre un fondo (tinte de respuestas y burbujas). `amount` de 0 a 1. */
export function tint(hex: string, background: string, amount: number): string {
  const parse = (h: string) => {
    const v = h.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  };
  const a = parse(hex);
  const b = parse(background);
  const t = Math.min(1, Math.max(0, amount));
  const mix = a.map((c, i) => Math.round(c * t + b[i] * (1 - t)));
  return `#${mix.map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

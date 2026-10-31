/** Lógica pura de los juegos de pareja: catálogo, parseo de las RPC, coincidencias y turnos. */
import { APP_NAME } from '@/constants/app';
import type { Stroke } from '@/lib/drawing';
import type { Intensity } from '@/lib/questions';
import type { Json } from '@/types/database';

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export type GameId = 'wyr' | 'nhie' | 'most_likely' | 'agree';

export const GAME_IDS: readonly GameId[] = ['wyr', 'nhie', 'most_likely', 'agree'];

export type GameInfo = { id: GameId; name: string; tagline: string; howTo: string };

export const GAMES: Record<GameId, GameInfo> = {
  wyr: {
    id: 'wyr',
    name: '¿Qué prefieres?',
    tagline: 'Dos opciones, cero términos medios.',
    howTo:
      'Cada quien elige la opción que prefiere, a su ritmo. Cuando los dos terminen, se revela quién eligió qué y cuánto coinciden.',
  },
  nhie: {
    id: 'nhie',
    name: 'Yo nunca',
    tagline: 'Descubran qué han hecho (y qué no).',
    howTo:
      'En cada frase eliges "Yo sí" si ya lo hiciste o "Yo nunca" si no. Al terminar los dos, comparan sus respuestas.',
  },
  most_likely: {
    id: 'most_likely',
    name: '¿Quién es más probable?',
    tagline: 'A quién le toca la culpa… o el mérito.',
    howTo:
      'Para cada frase señalas quién de los dos es más probable que la cumpla: tú o tu pareja. Coinciden cuando los dos señalan a la misma persona.',
  },
  agree: {
    id: 'agree',
    name: 'De acuerdo o no',
    tagline: 'Opiniones sin pelear (casi).',
    howTo:
      'Lees una opinión y dices si estás de acuerdo o no. Cuando los dos terminen, ven en cuáles piensan igual.',
  },
};

export const DRAWING_INFO = {
  name: 'Reto de dibujo',
  tagline: 'Dibuja algo y que tu pareja adivine.',
  howTo:
    'Te toca una palabra secreta y la dibujas con el dedo. Tu pareja ve el dibujo y tiene hasta 10 intentos para adivinarla. Si no te late la palabra, puedes cambiarla hasta 3 veces.',
} as const;

export const MAX_DRAWING_GUESSES = 10;
export const MAX_GUESS_LENGTH = 60;

export function isGameId(x: unknown): x is GameId {
  return typeof x === 'string' && (GAME_IDS as readonly string[]).includes(x);
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type GameItem = {
  id: string;
  position: number;
  text: string;
  /** Solo en `wyr`. */
  options: string[] | null;
  intensity: Intensity;
};

export type RoundMatch = { matches: number; total: number; pct: number };

export type GameRound = {
  id: string;
  game: GameId;
  spicy: boolean;
  status: 'playing' | 'finished';
  created_by: string;
  created_at: string;
  finished_at: string | null;
  total: number;
  my_count: number;
  partner_count: number;
  items: GameItem[];
  /** question_id → choice (0 | 1). */
  mine: Record<string, number>;
  /** Solo cuando la ronda terminó. */
  partner: Record<string, number> | null;
  match: RoundMatch | null;
};

export type OpenRound = {
  id: string;
  spicy: boolean;
  created_by: string;
  created_at: string;
  my_count: number;
  partner_count: number;
  total: number;
};

export type GameStats = {
  game: GameId;
  open_round: OpenRound | null;
  finished_count: number;
  avg_pct: number | null;
  last_pct: number | null;
};

export type RecentRound = {
  id: string;
  game: GameId;
  spicy: boolean;
  finished_at: string;
  pct: number;
};

export type DrawingStatus = 'drawing' | 'guessing' | 'solved' | 'gave_up';

export type DrawingSummary = {
  id: string;
  drawer_id: string;
  guesser_id: string;
  status: DrawingStatus;
  created_at: string;
  drawn_at: string | null;
  finished_at: string | null;
  guess_count: number;
  /** Solo la ve quien dibuja o cuando el reto terminó. */
  word: string | null;
};

export type DrawingGuess = { text: string; at: string };

export type Drawing = DrawingSummary & {
  /** Solo después de enviar el dibujo. */
  strokes: Stroke[] | null;
  guesses: DrawingGuess[];
  /** "_ _ _   _ _" (un `_` por letra, tres espacios entre palabras). */
  hint: string;
  word_length: number;
  rerolls_left: number;
};

export type GameOverview = {
  games: GameStats[];
  recent: RecentRound[];
  drawings: { active: DrawingSummary[]; recent: DrawingSummary[] };
};

export type GuessResult = { correct: boolean; drawing: Drawing };

// ---------------------------------------------------------------------------
// Parseo
// ---------------------------------------------------------------------------

type Obj = { [key: string]: Json | undefined };

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function fail(what: string): never {
  throw new Error(`Respuesta inesperada del servidor: ${what}`);
}

function obj(v: Json | undefined, what: string): Obj {
  if (!isObj(v)) fail(what);
  return v;
}

function str(o: Obj, key: string, what: string): string {
  const v = o[key];
  if (typeof v !== 'string') fail(`${what}.${key}`);
  return v;
}

function num(o: Obj, key: string, what: string): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${what}.${key}`);
  return v;
}

function bool(o: Obj, key: string, what: string): boolean {
  const v = o[key];
  if (typeof v !== 'boolean') fail(`${what}.${key}`);
  return v;
}

function strOrNull(o: Obj, key: string, what: string): string | null {
  const v = o[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') fail(`${what}.${key}`);
  return v;
}

function numOrNull(o: Obj, key: string, what: string): number | null {
  const v = o[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${what}.${key}`);
  return v;
}

function arr(v: Json | undefined, what: string): Json[] {
  if (v === null || v === undefined) return [];
  if (!Array.isArray(v)) fail(what);
  return v;
}

function gameId(v: string, what: string): GameId {
  if (!isGameId(v)) fail(what);
  return v;
}

function intensity(v: string, what: string): Intensity {
  if (v !== 'ligera' && v !== 'profunda' && v !== 'picante') fail(what);
  return v;
}

function parseItem(v: Json | undefined): GameItem {
  const o = obj(v, 'item');
  const options = o.options;
  if (
    options != null &&
    (!Array.isArray(options) || !options.every((x) => typeof x === 'string'))
  ) {
    fail('item.options');
  }
  return {
    id: str(o, 'id', 'item'),
    position: num(o, 'position', 'item'),
    text: str(o, 'text', 'item'),
    options: (options as string[] | null | undefined) ?? null,
    intensity: intensity(str(o, 'intensity', 'item'), 'item.intensity'),
  };
}

function parseChoices(v: Json | undefined, what: string): Record<string, number> {
  const out: Record<string, number> = {};
  if (v === null || v === undefined) return out;
  const o = obj(v, what);
  for (const [k, c] of Object.entries(o)) {
    if (c !== 0 && c !== 1) fail(`${what}.${k}`);
    out[k] = c;
  }
  return out;
}

function parseMatch(v: Json | undefined): RoundMatch | null {
  if (v === null || v === undefined) return null;
  const o = obj(v, 'match');
  return {
    matches: num(o, 'matches', 'match'),
    total: num(o, 'total', 'match'),
    pct: num(o, 'pct', 'match'),
  };
}

export function parseGameRound(v: Json | undefined): GameRound {
  const o = obj(v, 'round');
  const status = str(o, 'status', 'round');
  if (status !== 'playing' && status !== 'finished') fail('round.status');
  const items = arr(o.items, 'round.items')
    .map(parseItem)
    .sort((a, b) => a.position - b.position);
  return {
    id: str(o, 'id', 'round'),
    game: gameId(str(o, 'game', 'round'), 'round.game'),
    spicy: bool(o, 'spicy', 'round'),
    status,
    created_by: str(o, 'created_by', 'round'),
    created_at: str(o, 'created_at', 'round'),
    finished_at: strOrNull(o, 'finished_at', 'round'),
    total: num(o, 'total', 'round'),
    my_count: num(o, 'my_count', 'round'),
    partner_count: num(o, 'partner_count', 'round'),
    items,
    mine: parseChoices(o.mine, 'round.mine'),
    partner: o.partner == null ? null : parseChoices(o.partner, 'round.partner'),
    match: parseMatch(o.match),
  };
}

function parseOpenRound(v: Json | undefined): OpenRound | null {
  if (v === null || v === undefined) return null;
  const o = obj(v, 'open_round');
  const w = 'open_round';
  return {
    id: str(o, 'id', w),
    spicy: bool(o, 'spicy', w),
    created_by: str(o, 'created_by', w),
    created_at: str(o, 'created_at', w),
    my_count: num(o, 'my_count', w),
    partner_count: num(o, 'partner_count', w),
    total: num(o, 'total', w),
  };
}

function parseGameStats(v: Json | undefined): GameStats {
  const o = obj(v, 'game');
  return {
    game: gameId(str(o, 'game', 'game'), 'game.game'),
    open_round: parseOpenRound(o.open_round),
    finished_count: numOrNull(o, 'finished_count', 'game') ?? 0,
    avg_pct: numOrNull(o, 'avg_pct', 'game'),
    last_pct: numOrNull(o, 'last_pct', 'game'),
  };
}

function parseRecentRound(v: Json | undefined): RecentRound {
  const o = obj(v, 'recent');
  return {
    id: str(o, 'id', 'recent'),
    game: gameId(str(o, 'game', 'recent'), 'recent.game'),
    spicy: bool(o, 'spicy', 'recent'),
    finished_at: str(o, 'finished_at', 'recent'),
    pct: num(o, 'pct', 'recent'),
  };
}

function drawingStatus(v: string, what: string): DrawingStatus {
  if (v !== 'drawing' && v !== 'guessing' && v !== 'solved' && v !== 'gave_up') fail(what);
  return v;
}

export function parseDrawingSummary(v: Json | undefined): DrawingSummary {
  const o = obj(v, 'drawing');
  const w = 'drawing';
  return {
    id: str(o, 'id', w),
    drawer_id: str(o, 'drawer_id', w),
    guesser_id: str(o, 'guesser_id', w),
    status: drawingStatus(str(o, 'status', w), 'drawing.status'),
    created_at: str(o, 'created_at', w),
    drawn_at: strOrNull(o, 'drawn_at', w),
    finished_at: strOrNull(o, 'finished_at', w),
    guess_count: numOrNull(o, 'guess_count', w) ?? 0,
    word: strOrNull(o, 'word', w),
  };
}

function parseGuess(v: Json | undefined): DrawingGuess {
  const o = obj(v, 'guess');
  return { text: str(o, 'text', 'guess'), at: strOrNull(o, 'at', 'guess') ?? '' };
}

export function parseDrawing(v: Json | undefined): Drawing {
  const o = obj(v, 'drawing');
  const summary = parseDrawingSummary(v);
  const strokes = o.strokes;
  if (strokes != null && !Array.isArray(strokes)) fail('drawing.strokes');
  const guesses = arr(o.guesses, 'drawing.guesses').map(parseGuess);
  return {
    ...summary,
    // Los trazos los validó el servidor al guardarlos (mismo formato que stories.strokes).
    strokes: (strokes as unknown as Stroke[] | null | undefined) ?? null,
    guesses,
    guess_count: guesses.length,
    hint: strOrNull(o, 'hint', 'drawing') ?? '',
    word_length: numOrNull(o, 'word_length', 'drawing') ?? 0,
    rerolls_left: numOrNull(o, 'rerolls_left', 'drawing') ?? 0,
  };
}

export function parseGameOverview(v: Json | undefined): GameOverview {
  const o = obj(v, 'overview');
  const d = o.drawings == null ? {} : obj(o.drawings, 'overview.drawings');
  return {
    games: arr(o.games, 'overview.games').map(parseGameStats),
    recent: arr(o.recent, 'overview.recent').map(parseRecentRound),
    drawings: {
      active: arr(d.active, 'drawings.active').map(parseDrawingSummary),
      recent: arr(d.recent, 'drawings.recent').map(parseDrawingSummary),
    },
  };
}

/** Respuesta de `guess_drawing`: `{ correct, drawing }`. */
export function parseGuessResult(v: Json | undefined): GuessResult {
  const o = obj(v, 'guess_result');
  return { correct: bool(o, 'correct', 'guess_result'), drawing: parseDrawing(o.drawing) };
}

// ---------------------------------------------------------------------------
// Respuestas y coincidencias
// ---------------------------------------------------------------------------

/** Textos de los dos botones de respuesta (choice 0 y choice 1). */
export function answerLabels(
  game: GameId,
  item: Pick<GameItem, 'options'>,
  partnerName: string,
): [string, string] {
  switch (game) {
    case 'wyr':
      return [item.options?.[0] ?? 'Opción A', item.options?.[1] ?? 'Opción B'];
    case 'nhie':
      return ['Yo sí', 'Yo nunca'];
    case 'most_likely':
      return ['Yo', partnerName];
    case 'agree':
      return ['De acuerdo', 'En desacuerdo'];
  }
}

/**
 * ¿Coinciden dos respuestas? En `most_likely` cada quien señala a alguien: coinciden cuando
 * los dos señalan a la misma persona, o sea cuando los choices son distintos.
 */
export function itemMatches(game: GameId, mine: number, partner: number): boolean {
  return game === 'most_likely' ? mine !== partner : mine === partner;
}

/** Espejo de `private.game_round_match`: null si aún no se conocen las dos respuestas. */
export function roundMatch(round: GameRound): RoundMatch | null {
  if (!round.partner) return null;
  const total = Math.max(round.items.length || round.total, 1);
  let matches = 0;
  for (const item of round.items) {
    const m = round.mine[item.id];
    const p = round.partner[item.id];
    if (m !== undefined && p !== undefined && itemMatches(round.game, m, p)) matches++;
  }
  return { matches, total, pct: Math.round((100 * matches) / total) };
}

/**
 * A quién señala una respuesta de `most_likely` desde mi punto de vista.
 * Mi choice 0 ("Yo") me señala a mí; el choice 0 de mi pareja ("Yo") la señala a ella.
 */
export function pointedAt(game: GameId, choice: number, isMine: boolean): 'me' | 'partner' {
  void game;
  const self = choice === 0;
  if (isMine) return self ? 'me' : 'partner';
  return self ? 'partner' : 'me';
}

/** Frase cálida según el % de coincidencia (sin culpar a nadie). */
export function matchHeadline(pct: number): string {
  if (pct >= 100) return '¡Idénticos! Pensaron exactamente igual en todo.';
  if (pct >= 85) return 'Casi leyéndose la mente. Qué conexión tan bonita.';
  if (pct >= 60) return 'Se entienden bien, y lo que cambia lo hace más interesante.';
  if (pct >= 30) return 'Cada quien con su estilo, y justo ahí está lo divertido de conocerse.';
  return 'Polos opuestos: tienen mucho que platicar y descubrir juntos.';
}

// ---------------------------------------------------------------------------
// Turnos
// ---------------------------------------------------------------------------

export type RoundTurn = 'my_turn' | 'waiting_partner' | 'finished';

export function roundTurn(round: Pick<GameRound, 'status' | 'my_count' | 'total'>): RoundTurn {
  if (round.status === 'finished') return 'finished';
  return round.my_count >= round.total ? 'waiting_partner' : 'my_turn';
}

/** Primer ítem (por position) que aún no contesté, o null. */
export function nextItem(round: Pick<GameRound, 'items' | 'mine'>): GameItem | null {
  const sorted = [...round.items].sort((a, b) => a.position - b.position);
  return sorted.find((i) => round.mine[i.id] === undefined) ?? null;
}

export type DrawingRole = 'drawer' | 'guesser';
export type DrawingTurn = 'drawing' | 'waiting_guess' | 'waiting_drawing' | 'my_guess' | 'finished';

export function drawingRole(d: Pick<DrawingSummary, 'drawer_id'>, meId: string): DrawingRole {
  return d.drawer_id === meId ? 'drawer' : 'guesser';
}

export function drawingTurn(
  d: Pick<DrawingSummary, 'drawer_id' | 'status'>,
  meId: string,
): DrawingTurn {
  if (d.status === 'solved' || d.status === 'gave_up') return 'finished';
  const drawer = d.drawer_id === meId;
  if (d.status === 'drawing') return drawer ? 'drawing' : 'waiting_drawing';
  return drawer ? 'waiting_guess' : 'my_guess';
}

export function guessesLeft(d: Pick<Drawing, 'guesses'>): number {
  return Math.max(0, MAX_DRAWING_GUESSES - d.guesses.length);
}

// ---------------------------------------------------------------------------
// Intentos (espejo de private.guess_key / guess_key_bare; el servidor decide)
// ---------------------------------------------------------------------------

const FOLD_FROM = 'áéíóúüñàèìòù';
const FOLD_TO = 'aeiouunaeiou';

function guessKey(text: string): string {
  const folded = Array.from(text.trim().toLowerCase())
    .map((ch) => {
      const i = FOLD_FROM.indexOf(ch);
      return i >= 0 ? FOLD_TO[i] : ch;
    })
    .join('');
  return folded.replace(/[^a-z0-9]+/g, ' ').trim();
}

function guessKeyBare(text: string): string {
  return guessKey(text).replace(/^(el|la|los|las|un|una) (.+)$/, '$2');
}

export function isCorrectGuess(
  word: string,
  alternates: readonly string[],
  guess: string,
): boolean {
  const key = guessKey(guess);
  if (key === '') return false;
  const bare = guessKeyBare(guess);
  return [word, ...alternates].some((c) => guessKey(c) === key || guessKeyBare(c) === bare);
}

// ---------------------------------------------------------------------------
// Texto para compartir
// ---------------------------------------------------------------------------

export type ShareNames = { me: string; partner: string };

/** Texto para `Share` de una ronda terminada: % y hasta 3 coincidencias. */
export function roundShareText(round: GameRound, names: ShareNames): string {
  const match = round.match ?? roundMatch(round);
  const info = GAMES[round.game];
  if (!match) return `${info.name} en ${APP_NAME}`;
  const lines = [
    `${info.name}: ${names.me} y ${names.partner} coincidimos en ${match.pct}% (${match.matches} de ${match.total}).`,
  ];
  const partner = round.partner;
  const hits: string[] = [];
  if (partner) {
    for (const item of round.items) {
      const m = round.mine[item.id];
      const p = partner[item.id];
      if (m === undefined || p === undefined || !itemMatches(round.game, m, p)) continue;
      let answer: string;
      if (round.game === 'most_likely') {
        answer = pointedAt(round.game, m, true) === 'me' ? names.me : names.partner;
      } else {
        answer = answerLabels(round.game, item, names.partner)[m];
      }
      hits.push(`• ${item.text} → ${answer}`);
      if (hits.length === 3) break;
    }
  }
  if (hits.length > 0) lines.push('', 'Coincidimos en:', ...hits);
  lines.push('', `Jugado en ${APP_NAME}`);
  return lines.join('\n');
}

/** Texto para `Share` de un reto de dibujo terminado. */
export function drawingShareText(
  d: Pick<Drawing, 'status' | 'word' | 'guesses' | 'guess_count'>,
  names: { drawer: string; guesser: string },
): string {
  const word = d.word ? `«${d.word}»` : 'la palabra secreta';
  const tries = Math.max(d.guesses.length, d.guess_count);
  const plural = tries === 1 ? 'intento' : 'intentos';
  let body: string;
  if (d.status === 'solved') {
    body = `${names.guesser} adivinó ${word} en ${tries} ${plural}. El dibujo es de ${names.drawer}.`;
  } else if (d.status === 'gave_up') {
    body = `${names.guesser} no pudo adivinar ${word} (${tries} ${plural}). El dibujo es de ${names.drawer}.`;
  } else {
    body = `${names.drawer} dibujó algo y ${names.guesser} lo está adivinando.`;
  }
  return `${DRAWING_INFO.name}: ${body}\n\nJugado en ${APP_NAME}`;
}

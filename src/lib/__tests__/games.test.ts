import type { Json } from '@/types/database';

import {
  answerLabels,
  drawingRole,
  drawingShareText,
  drawingTurn,
  GAME_IDS,
  GAMES,
  guessesLeft,
  isCorrectGuess,
  isGameId,
  itemMatches,
  matchHeadline,
  nextItem,
  parseDrawing,
  parseDrawingSummary,
  parseGameOverview,
  parseGameRound,
  parseGuessResult,
  pointedAt,
  roundMatch,
  roundShareText,
  roundTurn,
  type Drawing,
  type GameItem,
  type GameRound,
} from '../games';

const item = (n: number, options: string[] | null = null): GameItem => ({
  id: `q${n}`,
  position: n,
  text: `Pregunta ${n}`,
  options,
  intensity: 'ligera',
});

function round(over: Partial<GameRound> = {}): GameRound {
  return {
    id: 'r1',
    game: 'agree',
    spicy: false,
    status: 'playing',
    created_by: 'u1',
    created_at: '2026-11-01T00:00:00Z',
    finished_at: null,
    total: 3,
    my_count: 0,
    partner_count: 0,
    items: [item(0), item(1), item(2)],
    mine: {},
    partner: null,
    match: null,
    ...over,
  };
}

const rawRound = {
  id: 'r1',
  game: 'wyr',
  spicy: false,
  status: 'playing',
  created_by: 'u1',
  created_at: '2026-11-01T00:00:00Z',
  finished_at: null,
  total: 2,
  my_count: 1,
  partner_count: 0,
  items: [
    { id: 'b', position: 1, text: 'B', options: ['x', 'y'], intensity: 'picante' },
    { id: 'a', position: 0, text: 'A', options: ['x', 'y'], intensity: 'ligera' },
  ],
  mine: { a: 1 },
  partner: null,
  match: null,
};

const rawSummary = {
  id: 'd1',
  drawer_id: 'u1',
  guesser_id: 'u2',
  status: 'guessing',
  created_at: '2026-11-01T00:00:00Z',
  drawn_at: '2026-11-01T00:05:00Z',
  finished_at: null,
  guess_count: 1,
  word: null,
};

const rawDrawing = {
  ...rawSummary,
  strokes: [{ c: 'ink', w: 4, p: [1, 2, 3, 4] }],
  guesses: [{ text: 'perro', at: '2026-11-01T00:06:00Z' }],
  hint: '_ _ _ _ _',
  word_length: 5,
  rerolls_left: 2,
};

describe('catálogo', () => {
  it('tiene los 4 juegos con copy', () => {
    expect(GAME_IDS).toEqual(['wyr', 'nhie', 'most_likely', 'agree']);
    expect(GAMES.wyr.name).toBe('¿Qué prefieres?');
    expect(GAMES.nhie.name).toBe('Yo nunca');
    expect(GAMES.most_likely.name).toBe('¿Quién es más probable?');
    expect(GAMES.agree.name).toBe('De acuerdo o no');
    for (const id of GAME_IDS) {
      expect(GAMES[id].id).toBe(id);
      expect(GAMES[id].tagline.length).toBeGreaterThan(0);
      expect(GAMES[id].howTo.length).toBeGreaterThan(0);
    }
  });

  it('isGameId', () => {
    expect(isGameId('wyr')).toBe(true);
    expect(isGameId('drawing')).toBe(false);
    expect(isGameId(null)).toBe(false);
    expect(isGameId(3)).toBe(false);
  });
});

describe('parseGameRound', () => {
  it('parsea y ordena los ítems por position', () => {
    const r = parseGameRound(rawRound);
    expect(r.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(r.items[0].options).toEqual(['x', 'y']);
    expect(r.mine).toEqual({ a: 1 });
    expect(r.partner).toBeNull();
    expect(r.match).toBeNull();
  });

  it('parsea una ronda terminada', () => {
    const r = parseGameRound({
      ...rawRound,
      status: 'finished',
      finished_at: '2026-11-02T00:00:00Z',
      partner: { a: 1, b: 0 },
      match: { matches: 1, total: 2, pct: 50 },
    });
    expect(r.partner).toEqual({ a: 1, b: 0 });
    expect(r.match).toEqual({ matches: 1, total: 2, pct: 50 });
  });

  it('tolera options, mine e items nulos', () => {
    const r = parseGameRound({
      ...rawRound,
      items: [{ id: 'a', position: 0, text: 'A', options: null, intensity: 'ligera' }],
      mine: null,
    });
    expect(r.items[0].options).toBeNull();
    expect(r.mine).toEqual({});
    expect(parseGameRound({ ...rawRound, items: null }).items).toEqual([]);
  });

  it('rechaza formatos inválidos', () => {
    expect(() => parseGameRound(null)).toThrow(/inesperada/);
    expect(() => parseGameRound({ ...rawRound, game: 'drawing' })).toThrow();
    expect(() => parseGameRound({ ...rawRound, status: 'x' })).toThrow();
    expect(() => parseGameRound({ ...rawRound, mine: { a: 2 } })).toThrow();
    expect(() => parseGameRound({ ...rawRound, total: 'x' })).toThrow();
    expect(() => parseGameRound({ ...rawRound, items: [{ id: 'a' }] })).toThrow();
    expect(() =>
      parseGameRound({
        ...rawRound,
        items: [{ id: 'a', position: 0, text: 'A', options: [1], intensity: 'ligera' }],
      }),
    ).toThrow();
  });
});

describe('parseGameOverview', () => {
  const stats = (game: string, open: Json = null) => ({
    game,
    open_round: open,
    finished_count: 0,
    avg_pct: null,
    last_pct: null,
  });

  it('parsea los juegos, recientes y dibujos', () => {
    const o = parseGameOverview({
      games: [
        stats('wyr', {
          id: 'r1',
          spicy: true,
          created_by: 'u1',
          created_at: 'x',
          my_count: 2,
          partner_count: 0,
          total: 10,
        }),
        { ...stats('nhie'), finished_count: 3, avg_pct: 64, last_pct: 70 },
      ],
      recent: [{ id: 'r0', game: 'agree', spicy: false, finished_at: 'y', pct: 80 }],
      drawings: { active: [rawSummary], recent: [] },
    });
    expect(o.games).toHaveLength(2);
    expect(o.games[0].open_round?.total).toBe(10);
    expect(o.games[1]).toMatchObject({ finished_count: 3, avg_pct: 64, last_pct: 70 });
    expect(o.recent[0].pct).toBe(80);
    expect(o.drawings.active[0].id).toBe('d1');
    expect(o.drawings.recent).toEqual([]);
  });

  it('tolera listas faltantes', () => {
    expect(parseGameOverview({})).toEqual({
      games: [],
      recent: [],
      drawings: { active: [], recent: [] },
    });
    expect(parseGameOverview({ drawings: null }).drawings.active).toEqual([]);
  });

  it('rechaza juegos desconocidos o no objetos', () => {
    expect(() => parseGameOverview(null)).toThrow();
    expect(() => parseGameOverview({ games: [stats('xx')] })).toThrow();
    expect(() => parseGameOverview({ games: 3 })).toThrow();
  });
});

describe('parseDrawing', () => {
  it('parsea el resumen', () => {
    const s = parseDrawingSummary(rawSummary);
    expect(s).toMatchObject({ id: 'd1', status: 'guessing', word: null, guess_count: 1 });
    expect(() => parseDrawingSummary({ ...rawSummary, status: 'x' })).toThrow();
    expect(() => parseDrawingSummary(null)).toThrow();
  });

  it('parsea el reto completo', () => {
    const d = parseDrawing(rawDrawing);
    expect(d.strokes).toHaveLength(1);
    expect(d.guesses).toEqual([{ text: 'perro', at: '2026-11-01T00:06:00Z' }]);
    expect(d.hint).toBe('_ _ _ _ _');
    expect(d.word_length).toBe(5);
    expect(d.rerolls_left).toBe(2);
  });

  it('tolera trazos nulos y campos faltantes', () => {
    const d = parseDrawing({ ...rawSummary, status: 'drawing', drawn_at: null, strokes: null });
    expect(d.strokes).toBeNull();
    expect(d.guesses).toEqual([]);
    expect(d.hint).toBe('');
    expect(d.rerolls_left).toBe(0);
  });

  it('rechaza trazos o intentos inválidos', () => {
    expect(() => parseDrawing({ ...rawDrawing, strokes: 'x' })).toThrow();
    expect(() => parseDrawing({ ...rawDrawing, guesses: [{ at: 'x' }] })).toThrow();
  });

  it('parseGuessResult', () => {
    const r = parseGuessResult({ correct: true, drawing: { ...rawDrawing, status: 'solved' } });
    expect(r.correct).toBe(true);
    expect(r.drawing.status).toBe('solved');
    expect(() => parseGuessResult({ drawing: rawDrawing })).toThrow();
    expect(() => parseGuessResult({ correct: false, drawing: null })).toThrow();
  });
});

describe('respuestas', () => {
  it('answerLabels por juego', () => {
    expect(answerLabels('wyr', { options: ['A', 'B'] }, 'Ana')).toEqual(['A', 'B']);
    expect(answerLabels('wyr', { options: null }, 'Ana')).toEqual(['Opción A', 'Opción B']);
    expect(answerLabels('nhie', { options: null }, 'Ana')).toEqual(['Yo sí', 'Yo nunca']);
    expect(answerLabels('most_likely', { options: null }, 'Ana')).toEqual(['Yo', 'Ana']);
    expect(answerLabels('agree', { options: null }, 'Ana')).toEqual([
      'De acuerdo',
      'En desacuerdo',
    ]);
  });

  it('itemMatches', () => {
    for (const g of ['wyr', 'nhie', 'agree'] as const) {
      expect(itemMatches(g, 0, 0)).toBe(true);
      expect(itemMatches(g, 1, 1)).toBe(true);
      expect(itemMatches(g, 0, 1)).toBe(false);
    }
    // most_likely: coinciden si señalan a la misma persona (choices distintos).
    expect(itemMatches('most_likely', 0, 1)).toBe(true);
    expect(itemMatches('most_likely', 1, 0)).toBe(true);
    expect(itemMatches('most_likely', 0, 0)).toBe(false);
    expect(itemMatches('most_likely', 1, 1)).toBe(false);
  });

  it('pointedAt', () => {
    expect(pointedAt('most_likely', 0, true)).toBe('me');
    expect(pointedAt('most_likely', 1, true)).toBe('partner');
    expect(pointedAt('most_likely', 0, false)).toBe('partner');
    expect(pointedAt('most_likely', 1, false)).toBe('me');
  });
});

describe('roundMatch', () => {
  it('null mientras no se conoce la pareja', () => {
    expect(roundMatch(round())).toBeNull();
  });

  it('cuenta coincidencias y redondea', () => {
    const r = round({
      status: 'finished',
      mine: { q0: 0, q1: 1, q2: 0 },
      partner: { q0: 0, q1: 0, q2: 0 },
    });
    expect(roundMatch(r)).toEqual({ matches: 2, total: 3, pct: 67 });
  });

  it('most_likely invierte la regla', () => {
    const r = round({
      game: 'most_likely',
      status: 'finished',
      mine: { q0: 0, q1: 1, q2: 0 },
      partner: { q0: 1, q1: 1, q2: 0 },
    });
    expect(roundMatch(r)).toEqual({ matches: 1, total: 3, pct: 33 });
  });

  it('ignora ítems sin respuesta de alguno y no divide entre cero', () => {
    const r = round({ items: [], total: 0, partner: {} });
    expect(roundMatch(r)).toEqual({ matches: 0, total: 1, pct: 0 });
    const half = round({ mine: { q0: 0 }, partner: { q0: 0 } });
    expect(roundMatch(half)).toEqual({ matches: 1, total: 3, pct: 33 });
  });

  it('100% y 0%', () => {
    const all = round({
      mine: { q0: 1, q1: 1, q2: 1 },
      partner: { q0: 1, q1: 1, q2: 1 },
    });
    expect(roundMatch(all)?.pct).toBe(100);
    const none = round({ mine: { q0: 1, q1: 1, q2: 1 }, partner: { q0: 0, q1: 0, q2: 0 } });
    expect(roundMatch(none)?.pct).toBe(0);
  });
});

describe('matchHeadline', () => {
  it('cambia por rango', () => {
    const all = [0, 29, 30, 59, 60, 84, 85, 99, 100].map(matchHeadline);
    expect(matchHeadline(0)).toBe(matchHeadline(29));
    expect(matchHeadline(30)).toBe(matchHeadline(59));
    expect(matchHeadline(60)).toBe(matchHeadline(84));
    expect(matchHeadline(85)).toBe(matchHeadline(99));
    expect(new Set(all).size).toBe(5);
    expect(matchHeadline(100)).not.toBe(matchHeadline(99));
  });
});

describe('turnos de ronda', () => {
  it('roundTurn', () => {
    expect(roundTurn(round({ my_count: 1 }))).toBe('my_turn');
    expect(roundTurn(round({ my_count: 3 }))).toBe('waiting_partner');
    expect(roundTurn(round({ my_count: 3, status: 'finished' }))).toBe('finished');
  });

  it('nextItem', () => {
    const r = round({ items: [item(2), item(0), item(1)], mine: { q0: 1 } });
    expect(nextItem(r)?.id).toBe('q1');
    expect(nextItem(round({ mine: { q0: 0, q1: 0, q2: 1 } }))).toBeNull();
    expect(nextItem(round())?.id).toBe('q0');
  });
});

describe('turnos de dibujo', () => {
  const d = (status: Drawing['status']) => ({ drawer_id: 'me', status });

  it('drawingRole', () => {
    expect(drawingRole({ drawer_id: 'me' }, 'me')).toBe('drawer');
    expect(drawingRole({ drawer_id: 'me' }, 'other')).toBe('guesser');
  });

  it('drawingTurn', () => {
    expect(drawingTurn(d('drawing'), 'me')).toBe('drawing');
    expect(drawingTurn(d('drawing'), 'other')).toBe('waiting_drawing');
    expect(drawingTurn(d('guessing'), 'me')).toBe('waiting_guess');
    expect(drawingTurn(d('guessing'), 'other')).toBe('my_guess');
    expect(drawingTurn(d('solved'), 'me')).toBe('finished');
    expect(drawingTurn(d('gave_up'), 'other')).toBe('finished');
  });

  it('guessesLeft', () => {
    expect(guessesLeft({ guesses: [] })).toBe(10);
    expect(guessesLeft({ guesses: [{ text: 'a', at: '' }] })).toBe(9);
    const many = Array.from({ length: 12 }, () => ({ text: 'a', at: '' }));
    expect(guessesLeft({ guesses: many })).toBe(0);
  });
});

describe('isCorrectGuess', () => {
  it('ignora acentos, mayúsculas y signos', () => {
    expect(isCorrectGuess('Camión', [], 'camion')).toBe(true);
    expect(isCorrectGuess('Camión', [], '  ¡CAMIÓN! ')).toBe(true);
    expect(isCorrectGuess('Piñata', [], 'pinata')).toBe(true);
    expect(isCorrectGuess('Tacos al pastor', [], 'tacos   al-pastor')).toBe(true);
  });

  it('ignora artículos iniciales en cualquier lado', () => {
    expect(isCorrectGuess('Perro', [], 'el perro')).toBe(true);
    expect(isCorrectGuess('La luna', [], 'luna')).toBe(true);
    expect(isCorrectGuess('La luna', [], 'una luna')).toBe(true);
    expect(isCorrectGuess('Los tacos', [], 'tacos')).toBe(true);
    expect(isCorrectGuess('Las llaves', [], 'las llaves')).toBe(true);
  });

  it('acepta alternativas', () => {
    expect(isCorrectGuess('Celular', ['Teléfono', 'el móvil'], 'telefono')).toBe(true);
    expect(isCorrectGuess('Celular', ['Teléfono', 'el móvil'], 'movil')).toBe(true);
  });

  it('rechaza incorrectos y vacíos', () => {
    expect(isCorrectGuess('Perro', [], 'gato')).toBe(false);
    expect(isCorrectGuess('Perro', [], '')).toBe(false);
    expect(isCorrectGuess('Perro', [], '¡¡!!')).toBe(false);
    expect(isCorrectGuess('Perro', [], 'perros')).toBe(false);
    // Un artículo solo no es una palabra sin artículo.
    expect(isCorrectGuess('El', [], 'el')).toBe(true);
    expect(isCorrectGuess('Luna', [], 'el')).toBe(false);
  });
});

describe('textos para compartir', () => {
  it('roundShareText con coincidencias', () => {
    const r = round({
      game: 'wyr',
      status: 'finished',
      items: [item(0, ['Playa', 'Montaña']), item(1, ['Té', 'Café']), item(2, ['A', 'B'])],
      mine: { q0: 0, q1: 1, q2: 0 },
      partner: { q0: 0, q1: 1, q2: 1 },
      match: { matches: 2, total: 3, pct: 67 },
    });
    const t = roundShareText(r, { me: 'Caleb', partner: 'Ana' });
    expect(t).toContain('67%');
    expect(t).toContain('Pregunta 0 → Playa');
    expect(t).toContain('Pregunta 1 → Café');
    expect(t).not.toContain('Pregunta 2');
    expect(t).toContain('App Parejas');
  });

  it('roundShareText most_likely nombra a la persona señalada y limita a 3', () => {
    const items = [0, 1, 2, 3, 4].map((n) => item(n));
    const r = round({
      game: 'most_likely',
      status: 'finished',
      items,
      mine: { q0: 0, q1: 1, q2: 0, q3: 0, q4: 0 },
      partner: { q0: 1, q1: 0, q2: 1, q3: 1, q4: 1 },
    });
    const t = roundShareText(r, { me: 'Caleb', partner: 'Ana' });
    expect(t).toContain('100%');
    expect(t).toContain('Pregunta 0 → Caleb');
    expect(t).toContain('Pregunta 1 → Ana');
    expect(t).not.toContain('Pregunta 3');
  });

  it('roundShareText sin resultados todavía', () => {
    expect(roundShareText(round(), { me: 'A', partner: 'B' })).toContain('De acuerdo o no');
  });

  it('drawingShareText', () => {
    const base = { word: 'Piñata', guesses: [{ text: 'a', at: '' }], guess_count: 1 };
    const names = { drawer: 'Caleb', guesser: 'Ana' };
    expect(drawingShareText({ ...base, status: 'solved' }, names)).toContain(
      'Ana adivinó «Piñata» en 1 intento',
    );
    expect(drawingShareText({ ...base, status: 'gave_up' }, names)).toContain('no pudo adivinar');
    const t = drawingShareText({ ...base, status: 'solved', guess_count: 3, guesses: [] }, names);
    expect(t).toContain('3 intentos');
    expect(t).toContain('App Parejas');
    expect(drawingShareText({ ...base, word: null, status: 'guessing' }, names)).toContain(
      'lo está adivinando',
    );
  });
});

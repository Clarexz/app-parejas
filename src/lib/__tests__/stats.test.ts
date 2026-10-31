import {
  bestMonth,
  bestMonthLine,
  bestStreakSentence,
  lastMonths,
  matchLine,
  monthShort,
  parseRelationshipStats,
  plural,
  sharedLine,
  sinceLastVisitLine,
  sinceStamp,
  streakSentence,
} from '../stats';

describe('parseRelationshipStats', () => {
  it('lee una respuesta completa', () => {
    const s = parseRelationshipStats({
      since: '2026-03-12',
      today: '2026-10-31',
      questions: {
        answered_me: 40,
        answered_partner: 38,
        answered_both: 35,
        daily_complete: 30,
        comments: 12,
      },
      streak: { current: 5, best: 21 },
      games: {
        rounds: 7,
        avg_pct: 72,
        best_pct: 100,
        by_game: [
          { game: 'wyr', rounds: 4, avg_pct: 70 },
          { game: 'otro', rounds: 1, avg_pct: 10 },
        ],
      },
      drawings: { solved: 3, finished: 4 },
      memories: {
        total: 9,
        photos: 20,
        by_month: [
          { month: '2026-10', count: 6 },
          { month: 'mal', count: 2 },
        ],
      },
      visits: { count: 2, days: 11 },
      stories: 8,
      moods: 15,
    });
    expect(s.since).toBe('2026-03-12');
    expect(s.questions.dailyComplete).toBe(30);
    expect(s.streak).toEqual({ current: 5, best: 21 });
    expect(s.games.byGame).toEqual([{ game: 'wyr', rounds: 4, avgPct: 70 }]);
    expect(s.memories.byMonth).toEqual([{ month: '2026-10', count: 6 }]);
    expect(s.stories).toBe(8);
  });

  it('con basura o nulos deja todo en cero', () => {
    for (const bad of [null, undefined, 'x', 3, [], { questions: 'x', games: { by_game: 4 } }]) {
      const s = parseRelationshipStats(bad);
      expect(s.since).toBeNull();
      expect(s.questions.answeredMe).toBe(0);
      expect(s.games).toEqual({ rounds: 0, avgPct: null, bestPct: null, byGame: [] });
      expect(s.memories.byMonth).toEqual([]);
      expect(s.moods).toBe(0);
    }
  });

  it('acepta números como texto y recorta porcentajes', () => {
    const s = parseRelationshipStats({
      questions: { answered_me: '4', comments: -2 },
      games: { avg_pct: 140, best_pct: 'x' },
    });
    expect(s.questions.answeredMe).toBe(4);
    expect(s.questions.comments).toBe(0);
    expect(s.games.avgPct).toBe(100);
    expect(s.games.bestPct).toBeNull();
  });
});

describe('lastMonths', () => {
  it('rellena con ceros y cruza el cambio de año', () => {
    const out = lastMonths(
      [
        { month: '2025-12', count: 3 },
        { month: '2026-02', count: 1 },
      ],
      '2026-03-05',
      5,
    );
    expect(out.map((m) => m.month)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
    expect(out.map((m) => m.count)).toEqual([0, 3, 0, 1, 0]);
    expect(out[1].label).toBe('dic');
  });

  it('da 12 meses por defecto, ignora los anteriores y tolera fechas malas', () => {
    const out = lastMonths([{ month: '2020-01', count: 9 }], '2026-10-31');
    expect(out).toHaveLength(12);
    expect(out[0].month).toBe('2025-11');
    expect(out[11].month).toBe('2026-10');
    expect(out.every((m) => m.count === 0)).toBe(true);
    expect(lastMonths([], 'nada')).toEqual([]);
  });
});

describe('bestMonth y frases', () => {
  it('elige el mejor mes (en empate, el más reciente)', () => {
    expect(bestMonth([])).toBeNull();
    expect(bestMonth([{ month: '2026-01', count: 0 }])).toBeNull();
    expect(
      bestMonth([
        { month: '2026-01', count: 4 },
        { month: '2026-10', count: 4 },
        { month: '2026-05', count: 2 },
      ]),
    ).toEqual({ month: '2026-10', count: 4 });
  });

  it('escribe las frases a mano', () => {
    expect(bestMonthLine({ month: '2026-10', count: 6 }, '2026-10-31')).toBe(
      'Su mejor mes fue octubre: 6 memorias',
    );
    expect(bestMonthLine({ month: '2025-12', count: 1 }, '2026-10-31')).toBe(
      'Su mejor mes fue diciembre de 2025: 1 memoria',
    );
    expect(bestMonthLine(null, '2026-10-31')).toBeNull();
    expect(matchLine(72)).toBe('Coinciden en el 72 % de los juegos');
    expect(matchLine(null)).toBeNull();
    expect(streakSentence(23)).toBe('23 días seguidos contestando.');
    expect(streakSentence(1)).toBe('1 día seguido contestando.');
    expect(streakSentence(0)).toMatch(/racha nueva/);
    expect(bestStreakSentence(1284)).toBe('Su récord es de 1,284 días.');
    expect(bestStreakSentence(0)).toMatch(/Todavía/);
    expect(sinceLastVisitLine(0)).toBe('Están juntos');
    expect(sinceLastVisitLine(1)).toBe('1 día sin verse');
    expect(sinceLastVisitLine(null)).toBeNull();
    expect(sharedLine(0, 0)).toBeNull();
    expect(sharedLine(1, 3)).toBe('1 story y 3 moods compartidos');
    expect(plural(2, 'foto', 'fotos')).toBe('2 fotos');
    expect(monthShort('2026-11')).toBe('nov');
    expect(sinceStamp('2026-03-12')).toBe('DESDE 12 MAR 2026');
    expect(sinceStamp(null)).toBe('HASTA HOY');
  });
});

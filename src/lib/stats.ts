/** Lógica pura de las estadísticas de la relación: parseo de la RPC, serie por mes y frases. */
import { formatNumber, parseIsoDate } from '@/lib/dates';
import type { GameId } from '@/lib/games';
import { isGameId } from '@/lib/games';

export type MonthCount = { month: string; count: number };
export type GameStat = { game: GameId; rounds: number; avgPct: number | null };

export type RelationshipStats = {
  since: string | null;
  today: string | null;
  questions: {
    answeredMe: number;
    answeredPartner: number;
    answeredBoth: number;
    dailyComplete: number;
    comments: number;
  };
  streak: { current: number; best: number };
  games: { rounds: number; avgPct: number | null; bestPct: number | null; byGame: GameStat[] };
  drawings: { solved: number; finished: number };
  memories: { total: number; photos: number; byMonth: MonthCount[] };
  visits: { count: number; days: number };
  stories: number;
  moods: number;
};

// ---------------------------------------------------------------------------
// Parseo defensivo
// ---------------------------------------------------------------------------

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Entero ≥ 0 (acepta números y cadenas numéricas); cualquier otra cosa es 0. */
function count(v: unknown): number {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function pct(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function isoOrNull(v: unknown): string | null {
  return typeof v === 'string' && parseIsoDate(v) ? v.slice(0, 10) : null;
}

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Lee el jsonb de `get_relationship_stats()`; lo que falte o venga raro queda en cero. */
export function parseRelationshipStats(value: unknown): RelationshipStats {
  const v = obj(value);
  const q = obj(v.questions);
  const s = obj(v.streak);
  const g = obj(v.games);
  const d = obj(v.drawings);
  const m = obj(v.memories);
  const vis = obj(v.visits);

  const byGame: GameStat[] = [];
  if (Array.isArray(g.by_game)) {
    for (const raw of g.by_game) {
      const o = obj(raw);
      if (isGameId(o.game)) {
        byGame.push({ game: o.game, rounds: count(o.rounds), avgPct: pct(o.avg_pct) });
      }
    }
  }

  const byMonth: MonthCount[] = [];
  if (Array.isArray(m.by_month)) {
    for (const raw of m.by_month) {
      const o = obj(raw);
      const month = typeof o.month === 'string' ? o.month.slice(0, 7) : '';
      if (MONTH_RE.test(month)) byMonth.push({ month, count: count(o.count) });
    }
  }

  return {
    since: isoOrNull(v.since),
    today: isoOrNull(v.today),
    questions: {
      answeredMe: count(q.answered_me),
      answeredPartner: count(q.answered_partner),
      answeredBoth: count(q.answered_both),
      dailyComplete: count(q.daily_complete),
      comments: count(q.comments),
    },
    streak: { current: count(s.current), best: count(s.best) },
    games: {
      rounds: count(g.rounds),
      avgPct: pct(g.avg_pct),
      bestPct: pct(g.best_pct),
      byGame,
    },
    drawings: { solved: count(d.solved), finished: count(d.finished) },
    memories: { total: count(m.total), photos: count(m.photos), byMonth },
    visits: { count: count(vis.count), days: count(vis.days) },
    stories: count(v.stories),
    moods: count(v.moods),
  };
}

// ---------------------------------------------------------------------------
// Meses
// ---------------------------------------------------------------------------

const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];
const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const MONTHS_STAMP = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
];

function monthParts(month: string): { year: number; m: number } | null {
  const r = MONTH_RE.exec(month);
  return r ? { year: Number(r[1]), m: Number(r[2]) } : null;
}

/** '2026-10' → "oct". */
export function monthShort(month: string): string {
  const p = monthParts(month);
  return p ? MONTHS_SHORT[p.m - 1] : '';
}

/** '2026-10' → "octubre". */
export function monthLong(month: string): string {
  const p = monthParts(month);
  return p ? MONTHS_LONG[p.m - 1] : '';
}

function monthKey(index: number): string {
  const year = Math.floor(index / 12);
  return `${String(year).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export type MonthBar = { month: string; label: string; count: number };

/**
 * Los últimos `n` meses terminando en el mes de `today` (los más viejos primero), con ceros en los
 * meses sin memorias y pasando bien por el cambio de año.
 */
export function lastMonths(byMonth: readonly MonthCount[], today: string, n = 12): MonthBar[] {
  const t = parseIsoDate(today);
  if (!t || n <= 0) return [];
  const counts = new Map<string, number>();
  for (const { month, count: c } of byMonth) {
    counts.set(month, (counts.get(month) ?? 0) + c);
  }
  const end = t.year * 12 + (t.month - 1);
  const out: MonthBar[] = [];
  for (let i = end - n + 1; i <= end; i++) {
    const month = monthKey(i);
    out.push({ month, label: monthShort(month), count: counts.get(month) ?? 0 });
  }
  return out;
}

/** El mes con más memorias (si empatan, el más reciente); null si no hay ninguna. */
export function bestMonth(byMonth: readonly MonthCount[]): MonthCount | null {
  let best: MonthCount | null = null;
  for (const m of byMonth) {
    if (m.count <= 0) continue;
    if (!best || m.count > best.count || (m.count === best.count && m.month > best.month)) {
      best = m;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Frases
// ---------------------------------------------------------------------------

/** "1 memoria" / "6 memorias". */
export function plural(n: number, one: string, many: string): string {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}

/** Sello del encabezado: "DESDE 12 MAR 2026" o, si aún no hay fecha, "HASTA HOY". */
export function sinceStamp(since: string | null): string {
  const p = parseIsoDate(since);
  if (!p) return 'HASTA HOY';
  return `DESDE ${p.day} ${MONTHS_STAMP[p.month - 1]} ${p.year}`;
}

/** "Su mejor mes fue octubre: 6 memorias" (con el año si no es el actual). */
export function bestMonthLine(best: MonthCount | null, today: string | null): string | null {
  if (!best) return null;
  const p = monthParts(best.month);
  const t = parseIsoDate(today);
  if (!p) return null;
  const name = monthLong(best.month);
  const withYear = t && t.year !== p.year ? `${name} de ${p.year}` : name;
  return `Su mejor mes fue ${withYear}: ${plural(best.count, 'memoria', 'memorias')}`;
}

/** "Coinciden en el 72 % de los juegos"; sin rondas, null. */
export function matchLine(avgPct: number | null): string | null {
  return avgPct === null ? null : `Coinciden en el ${avgPct} % de los juegos`;
}

/** "23 días seguidos contestando." / invitación si no hay racha. */
export function streakSentence(current: number): string {
  if (current <= 0) return 'Hoy puede empezar una racha nueva.';
  return `${plural(current, 'día seguido', 'días seguidos')} contestando.`;
}

export function bestStreakSentence(best: number): string {
  if (best <= 0) return 'Todavía no tienen un récord.';
  return `Su récord es de ${plural(best, 'día', 'días')}.`;
}

/** Renglón de la última visita: "Están juntos" / "4 días sin verse" / null si nunca se han visto. */
export function sinceLastVisitLine(daysSinceLast: number | null): string | null {
  if (daysSinceLast === null) return null;
  if (daysSinceLast === 0) return 'Están juntos';
  return `${plural(daysSinceLast, 'día', 'días')} sin verse`;
}

/** "3 stories y 8 moods compartidos"; null si no hay nada. */
export function sharedLine(stories: number, moods: number): string | null {
  if (stories + moods === 0) return null;
  const s = plural(stories, 'story', 'stories');
  const m = plural(moods, 'mood', 'moods');
  return `${s} y ${m} compartidos`;
}

/** Lógica pura del Inicio: resumen de días juntos, hitos y rótulos de día. */
import {
  daysBetween,
  daysTogether,
  elapsedBreakdown,
  formatBreakdown,
  formatNumber,
  parseIsoDate,
  upcomingMilestones,
  type IsoDate,
  type Milestone,
  type MilestoneKind,
} from './dates';
import { formatStampIsoDate } from './stampDate';

export type HomeSummary =
  | { state: 'none' }
  | { state: 'future'; daysUntil: number }
  | {
      state: 'counting';
      days: number;
      /** "3 años, 8 meses y 16 días"; vacío el primer día. */
      breakdown: string;
      /** Sello del hito de hoy ("HOY: 1,000 DÍAS"), si lo hay. */
      todayStamp: string | null;
      /** El próximo hito de cada tipo, sin el de hoy, ordenados por fecha. */
      upcoming: Milestone[];
    };

const KINDS: MilestoneKind[] = ['days', 'monthiversary', 'anniversary'];

/** Texto del sello de un hito que cae hoy. */
export function milestoneStamp(m: Milestone): string {
  if (m.kind === 'days') return `HOY: ${formatNumber(m.value)} DÍAS`;
  if (m.kind === 'anniversary') return `HOY: ${m.value === 1 ? '1 AÑO' : `${m.value} AÑOS`}`;
  return 'HOY: CUMPLEMÉS';
}

/** Renglón de "Lo que viene": el cumplemés antepone la palabra. */
export function milestoneLabel(m: Milestone): string {
  return m.kind === 'monthiversary' ? `Cumplemés: ${m.label}` : m.label;
}

/** Resumen del Inicio; tolera fechas ausentes o inválidas (→ `none`). */
export function homeSummary(anniversary: string | null | undefined, today: IsoDate): HomeSummary {
  if (!anniversary || !parseIsoDate(anniversary) || !parseIsoDate(today)) return { state: 'none' };
  const diff = daysBetween(today, anniversary);
  if (diff > 0) return { state: 'future', daysUntil: diff };

  const all = KINDS.flatMap((kind) =>
    upcomingMilestones(anniversary, today, { kinds: [kind], limit: 2 }),
  );
  const todays = all.filter((m) => m.daysUntil === 0);
  const upcoming: Milestone[] = [];
  for (const kind of KINDS) {
    const next = all.find((m) => m.kind === kind && m.daysUntil > 0);
    if (next) upcoming.push(next);
  }
  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  // Si coinciden varios hitos hoy, el sello prefiere aniversario > días > cumplemés.
  const todayPick =
    todays.find((m) => m.kind === 'anniversary') ??
    todays.find((m) => m.kind === 'days') ??
    todays[0];
  return {
    state: 'counting',
    days: daysTogether(anniversary, today),
    breakdown: formatBreakdown(elapsedBreakdown(anniversary, today)),
    todayStamp: todayPick ? milestoneStamp(todayPick) : null,
    upcoming,
  };
}

/** Encabezado de día del historial: "HOY", "AYER" o sello de fecha. */
export function dayHeading(day: IsoDate, today: IsoDate): string {
  const diff = daysBetween(day, today);
  if (diff === 0) return 'HOY';
  if (diff === 1) return 'AYER';
  return formatStampIsoDate(day);
}

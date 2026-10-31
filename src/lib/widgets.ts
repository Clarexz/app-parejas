/**
 * Lógica pura de los widgets de Android (Fase 5).
 *
 * La app guarda un *snapshot* con los datos de entrada (aniversario, zona horaria, nombres,
 * cumpleaños, mood de tu pareja…) y los widgets derivan lo que muestran con `widgetModel` al
 * dibujarse. Así los días juntos y la cuenta regresiva avanzan solos con la actualización
 * periódica aunque nadie abra la app; solo el mood necesita volver a leer del servidor.
 */
import {
  addMonths,
  daysBetween,
  daysTogether,
  formatNumber,
  parseIsoDate,
  todayIn,
  toIsoDate,
  upcomingMilestones,
  type IsoDate,
} from './dates';
import { simplifyStroke, type Stroke } from './drawing';
import { milestoneLabel } from './home';
import { moodLabel } from './mood';
import { isStoryActive, storyAgo, type StoryBg, type StoryFont, type StoryKind } from './stories';
import { DEFAULT_TIME_ZONE } from './timezone';

export const WIDGET_SNAPSHOT_VERSION = 2;

/** Nombres con los que se registran los widgets (app.config.ts y el task handler). */
export const WIDGET_NAMES = ['DaysTogether', 'PartnerMood', 'Countdown', 'PartnerStory'] as const;
export type WidgetName = (typeof WIDGET_NAMES)[number];

/** A dónde lleva tocar cada widget (deep link `appparejas://<ruta>`). */
export const WIDGET_ROUTES: Record<WidgetName, string> = {
  DaysTogether: '/',
  PartnerMood: '/moods',
  Countdown: '/',
  PartnerStory: '/stories',
};

/** Pasado este tiempo el snapshot se considera viejo y el widget intenta refrescar del servidor. */
export const SNAPSHOT_STALE_MS = 60 * 60 * 1000;

export type SnapshotPerson = { name: string; birthday: IsoDate | null };
export type SnapshotMood = { emoji: string; note: string | null; at: string };

/** Tolerancia (en unidades del lienzo 900x1600) con la que se simplifican los trazos del widget. */
export const WIDGET_STROKE_TOLERANCE = 4;

/** Story activa más nueva de tu pareja, tal como se guarda en el snapshot. */
export type SnapshotStory = {
  id: string;
  kind: StoryKind;
  createdAt: string;
  expiresAt: string;
  /** `data:image/jpeg;base64,…` de la miniatura (solo photo, y solo si pesa poco). */
  thumb: string | null;
  /** text: el texto; photo: el pie de foto (si hay). */
  text: string | null;
  bg: StoryBg | null;
  font: StoryFont | null;
  /** drawing: trazos ya simplificados. */
  strokes: Stroke[] | null;
};

export type WidgetStatus = 'ready' | 'signed_out' | 'no_couple';

export type WidgetSnapshot = {
  version: typeof WIDGET_SNAPSHOT_VERSION;
  status: WidgetStatus;
  anniversary: IsoDate | null;
  timezone: string;
  me: SnapshotPerson | null;
  partner: SnapshotPerson | null;
  partnerMood: SnapshotMood | null;
  /** Fase 8 (distancia). */
  distanceKm: number | null;
  /** Id de tu pareja (para abrir su story desde el widget). */
  partnerId: string | null;
  /** Fase 6: la story activa más nueva de tu pareja. */
  partnerStory: SnapshotStory | null;
  /** ISO del momento en que se armó el snapshot. */
  updatedAt: string;
};

export type CountdownKind = 'anniversary' | 'monthiversary' | 'days' | 'birthday';
export type WidgetCountdown = {
  kind: CountdownKind;
  title: string;
  date: IsoDate;
  daysUntil: number;
};

export type WidgetStory = Pick<
  SnapshotStory,
  'id' | 'kind' | 'thumb' | 'text' | 'bg' | 'font' | 'strokes'
> & { ago: string };

export type WidgetModel = {
  status: WidgetStatus;
  today: IsoDate;
  /** Día de relación (aniversario = día 1); null sin aniversario o si aún no llega. */
  daysTogether: number | null;
  /** Días que faltan para el aniversario si todavía no llega (si no, null). */
  daysUntilStart: number | null;
  partnerName: string;
  partnerMood: { emoji: string; label: string | null; note: string | null; ago: string } | null;
  nextEvent: WidgetCountdown | null;
  distanceKm: number | null;
  partnerId: string | null;
  /** Solo si sigue activa al dibujar. */
  partnerStory: WidgetStory | null;
  stale: boolean;
};

export type SnapshotInput = {
  anniversary: string | null | undefined;
  timezone: string | null | undefined;
  me: { name: string | null | undefined; birthday: string | null | undefined } | null;
  partner: { name: string | null | undefined; birthday: string | null | undefined } | null;
  partnerMood: { emoji: string; note: string | null; created_at: string } | null;
  distanceKm?: number | null;
  partnerId?: string | null;
  partnerStory?: {
    id: string;
    kind: StoryKind;
    created_at: string;
    expires_at: string;
    thumb?: string | null;
    text?: string | null;
    bg?: StoryBg | null;
    font?: StoryFont | null;
    strokes?: Stroke[] | null;
  } | null;
  now?: Date;
};

const cleanDate = (d: string | null | undefined): IsoDate | null =>
  parseIsoDate(d) ? (d as string).slice(0, 10) : null;

const cleanName = (n: string | null | undefined, fallback: string): string =>
  n && n.trim() ? n.trim() : fallback;

function person(p: SnapshotInput['me'], fallback: string): SnapshotPerson | null {
  if (!p) return null;
  return { name: cleanName(p.name, fallback), birthday: cleanDate(p.birthday) };
}

function cleanStory(v: SnapshotInput['partnerStory']): SnapshotStory | null {
  if (!v) return null;
  return {
    id: v.id,
    kind: v.kind,
    createdAt: v.created_at,
    expiresAt: v.expires_at,
    thumb: v.kind === 'photo' ? (v.thumb ?? null) : null,
    text: v.text?.trim() || null,
    bg: v.bg ?? null,
    font: v.font ?? null,
    strokes:
      v.kind === 'drawing' && v.strokes
        ? v.strokes.map((st) => ({ ...st, p: simplifyStroke(st.p, WIDGET_STROKE_TOLERANCE) }))
        : null,
  };
}

/** La story activa más nueva de `userId` (null si no hay). */
export function latestActiveStory<
  T extends { user_id: string; created_at: string; expires_at: string; deleted_at: string | null },
>(stories: readonly T[], userId: string | null | undefined, now: Date): T | null {
  if (!userId) return null;
  let best: T | null = null;
  for (const s of stories) {
    if (s.user_id !== userId || !isStoryActive(s, now)) continue;
    if (!best || Date.parse(s.created_at) > Date.parse(best.created_at)) best = s;
  }
  return best;
}

/** Snapshot de una sesión con pareja lista. */
export function buildWidgetSnapshot(input: SnapshotInput): WidgetSnapshot {
  return {
    version: WIDGET_SNAPSHOT_VERSION,
    status: 'ready',
    anniversary: cleanDate(input.anniversary),
    timezone: input.timezone || DEFAULT_TIME_ZONE,
    me: person(input.me, 'Tú'),
    partner: person(input.partner, 'Tu pareja'),
    partnerMood: input.partnerMood
      ? {
          emoji: input.partnerMood.emoji,
          note: input.partnerMood.note?.trim() || null,
          at: input.partnerMood.created_at,
        }
      : null,
    distanceKm: input.distanceKm ?? null,
    partnerId: input.partnerId ?? null,
    partnerStory: cleanStory(input.partnerStory),
    updatedAt: (input.now ?? new Date()).toISOString(),
  };
}

/** Snapshot vacío (sin sesión o sin pareja): los widgets invitan a abrir la app. */
export function emptyWidgetSnapshot(status: Exclude<WidgetStatus, 'ready'>, now = new Date()) {
  const s: WidgetSnapshot = {
    version: WIDGET_SNAPSHOT_VERSION,
    status,
    anniversary: null,
    timezone: DEFAULT_TIME_ZONE,
    me: null,
    partner: null,
    partnerMood: null,
    distanceKm: null,
    partnerId: null,
    partnerStory: null,
    updatedAt: now.toISOString(),
  };
  return s;
}

/** Valida lo que se leyó del almacenamiento (JSON de otra versión o corrupto → null). */
export function parseWidgetSnapshot(raw: string | null | undefined): WidgetSnapshot | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== 'object' || v === null) return null;
    const s = v as Partial<WidgetSnapshot>;
    if (s.version !== WIDGET_SNAPSHOT_VERSION) return null;
    if (s.status !== 'ready' && s.status !== 'signed_out' && s.status !== 'no_couple') return null;
    if (typeof s.updatedAt !== 'string' || typeof s.timezone !== 'string') return null;
    return s as WidgetSnapshot;
  } catch {
    return null;
  }
}

/** ¿Cambió algo que se vea en un widget? (ignora `updatedAt`). */
export function snapshotChanged(a: WidgetSnapshot | null, b: WidgetSnapshot): boolean {
  if (!a) return true;
  const strip = (s: WidgetSnapshot) => JSON.stringify({ ...s, updatedAt: '' });
  return strip(a) !== strip(b);
}

/** Próximo cumpleaños >= today; el 29 de febrero se festeja el 28 en años no bisiestos (D42). */
export function nextBirthday(birthday: IsoDate, today: IsoDate): IsoDate | null {
  const b = parseIsoDate(birthday);
  const t = parseIsoDate(today);
  if (!b || !t) return null;
  for (const year of [t.year, t.year + 1]) {
    // addMonths ajusta el 29/feb al último día del mes destino.
    const date = addMonths(
      toIsoDate({ year: b.year, month: b.month, day: b.day }),
      12 * (year - b.year),
    );
    if (date >= today) return date;
  }
  return null;
}

const KIND_RANK: Record<CountdownKind, number> = {
  anniversary: 0,
  birthday: 1,
  days: 2,
  monthiversary: 3,
};

/** Lo próximo que viene: hitos de la relación y cumpleaños de los dos. Hoy cuenta (daysUntil 0). */
export function nextCountdown(s: WidgetSnapshot, today: IsoDate): WidgetCountdown | null {
  const items: WidgetCountdown[] = [];
  if (s.anniversary && daysBetween(today, s.anniversary) <= 0) {
    for (const m of upcomingMilestones(s.anniversary, today, { limit: 3 })) {
      items.push({ kind: m.kind, title: milestoneLabel(m), date: m.date, daysUntil: m.daysUntil });
    }
  } else if (s.anniversary) {
    items.push({
      kind: 'anniversary',
      title: 'Empieza su historia',
      date: s.anniversary,
      daysUntil: daysBetween(today, s.anniversary),
    });
  }
  const birthdays: [SnapshotPerson | null, (name: string) => string][] = [
    [s.me, () => 'Tu cumple'],
    [s.partner, (name) => `Cumple de ${name}`],
  ];
  for (const [p, title] of birthdays) {
    if (!p?.birthday) continue;
    const date = nextBirthday(p.birthday, today);
    if (date)
      items.push({
        kind: 'birthday',
        title: title(p.name),
        date,
        daysUntil: daysBetween(today, date),
      });
  }
  items.sort((a, b) => a.daysUntil - b.daysUntil || KIND_RANK[a.kind] - KIND_RANK[b.kind]);
  return items[0] ?? null;
}

/** "ahorita", "hace 5 min", "hace 2 h", "ayer", "hace 3 días". */
export function formatAgo(fromIso: string, now: Date): string {
  const t = Date.parse(fromIso);
  if (Number.isNaN(t)) return '';
  const min = Math.floor((now.getTime() - t) / 60_000);
  if (min < 1) return 'ahorita';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ayer' : `hace ${formatNumber(d)} días`;
}

/** Lo que dibuja cada widget, calculado "ahora" a partir del snapshot. */
export function widgetModel(s: WidgetSnapshot | null, now: Date = new Date()): WidgetModel {
  const snap = s ?? emptyWidgetSnapshot('signed_out', now);
  const today = todayIn(snap.timezone, now);
  const ready = snap.status === 'ready';
  const diff = ready && snap.anniversary ? daysBetween(today, snap.anniversary) : null;
  const mood = ready ? snap.partnerMood : null;
  const story = ready ? snap.partnerStory : null;
  return {
    status: snap.status,
    today,
    daysTogether:
      diff !== null && diff <= 0 ? daysTogether(snap.anniversary as IsoDate, today) : null,
    daysUntilStart: diff !== null && diff > 0 ? diff : null,
    partnerName: snap.partner?.name ?? 'Tu pareja',
    partnerMood: mood
      ? {
          emoji: mood.emoji,
          label: moodLabel(mood.emoji),
          note: mood.note,
          ago: formatAgo(mood.at, now),
        }
      : null,
    nextEvent: ready ? nextCountdown(snap, today) : null,
    distanceKm: ready ? snap.distanceKm : null,
    partnerId: ready ? snap.partnerId : null,
    partnerStory:
      story && isStoryActive({ expires_at: story.expiresAt, deleted_at: null }, now)
        ? {
            id: story.id,
            kind: story.kind,
            thumb: story.thumb,
            text: story.text,
            bg: story.bg,
            font: story.font,
            strokes: story.strokes,
            ago: storyAgo(story.createdAt, now),
          }
        : null,
    stale: now.getTime() - Date.parse(snap.updatedAt) > SNAPSHOT_STALE_MS,
  };
}

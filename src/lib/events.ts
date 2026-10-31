/**
 * Lógica pura de las cuentas regresivas (Fase 8).
 *
 * Hay dos fuentes: los **automáticos** (aniversario, cumplemés, hitos de días y cumpleaños), que
 * se derivan de la pareja y los perfiles sin guardarse en la BD, y los **eventos** de la tabla
 * `events` (fechas propias y visitas). Todo se calcula contra "hoy" en la zona de la pareja.
 */
import {
  addMonths,
  daysBetween,
  parseIsoDate,
  toIsoDate,
  upcomingMilestones,
  type IsoDate,
} from './dates';
import { milestoneLabel } from './home';

export type EventKind = 'custom' | 'visit';

/** Lo mínimo de una fila de `events` que necesita la lógica (también va en el snapshot). */
export type EventInput = {
  id: string;
  kind: EventKind;
  title: string;
  emoji: string | null;
  date: IsoDate;
  recurring_yearly: boolean;
};

export type CountdownKind = 'anniversary' | 'monthiversary' | 'days' | 'birthday' | EventKind;

export type Countdown = {
  /** Estable: `event:<id>`, `auto:<kind>` o `birthday:me|partner`. */
  key: string;
  kind: CountdownKind;
  title: string;
  emoji: string | null;
  /** Próxima fecha (>= hoy). */
  date: IsoDate;
  daysUntil: number;
  /** Id de la fila de `events` (solo custom/visit). */
  eventId: string | null;
  recurring: boolean;
};

export type CountdownPerson = { name: string; birthday: string | null | undefined };

export type CountdownInput = {
  anniversary: string | null | undefined;
  me: CountdownPerson | null;
  partner: CountdownPerson | null;
  events: readonly EventInput[];
  today: IsoDate;
};

/** Desempate a igual fecha: visita, aniversario, cumpleaños, propio, días, cumplemés. */
const KIND_RANK: Record<CountdownKind, number> = {
  visit: 0,
  anniversary: 1,
  birthday: 2,
  custom: 3,
  days: 4,
  monthiversary: 5,
};

/**
 * Próxima vez (>= today) que cae una fecha. Sin recurrencia: la misma fecha o null si ya pasó.
 * Con recurrencia anual: el mismo día y mes de este año o del siguiente; el 29 de febrero se
 * festeja el 28 en años no bisiestos (D42).
 */
export function nextOccurrence(
  date: string,
  recurringYearly: boolean,
  today: IsoDate,
): IsoDate | null {
  const d = parseIsoDate(date);
  const t = parseIsoDate(today);
  if (!d || !t) return null;
  const iso = toIsoDate(d);
  if (!recurringYearly) return iso >= today ? iso : null;
  for (const year of [t.year, t.year + 1]) {
    // addMonths ajusta el 29/feb al último día del mes destino.
    const candidate = addMonths(iso, 12 * (year - d.year));
    if (candidate >= today) return candidate;
  }
  return null;
}

/** Próximo cumpleaños >= today (29/feb → 28 en años no bisiestos). */
export function nextBirthday(birthday: string, today: IsoDate): IsoDate | null {
  return nextOccurrence(birthday, true, today);
}

function sortCountdowns(items: Countdown[]): Countdown[] {
  return items.sort(
    (a, b) =>
      a.daysUntil - b.daysUntil ||
      KIND_RANK[a.kind] - KIND_RANK[b.kind] ||
      a.key.localeCompare(b.key),
  );
}

/** Cuentas regresivas de los eventos guardados (solo las que siguen por venir). */
export function eventCountdowns(events: readonly EventInput[], today: IsoDate): Countdown[] {
  const out: Countdown[] = [];
  for (const e of events) {
    const date = nextOccurrence(e.date, e.kind !== 'visit' && e.recurring_yearly, today);
    if (!date) continue;
    out.push({
      key: `event:${e.id}`,
      kind: e.kind,
      title: e.title,
      emoji: e.emoji,
      date,
      daysUntil: daysBetween(today, date),
      eventId: e.id,
      recurring: e.kind !== 'visit' && e.recurring_yearly,
    });
  }
  return sortCountdowns(out);
}

/**
 * Automáticos: el próximo hito de cada tipo de la relación (o "Empieza su historia" si el
 * aniversario aún no llega) y los cumpleaños de los dos.
 */
export function autoCountdowns(input: Omit<CountdownInput, 'events'>): Countdown[] {
  const { anniversary, today } = input;
  const out: Countdown[] = [];
  const auto = (kind: CountdownKind, title: string, date: IsoDate): Countdown => ({
    key: `auto:${kind}`,
    kind,
    title,
    emoji: null,
    date,
    daysUntil: daysBetween(today, date),
    eventId: null,
    recurring: kind !== 'days',
  });
  if (anniversary && parseIsoDate(anniversary) && parseIsoDate(today)) {
    if (daysBetween(today, anniversary) <= 0) {
      for (const kind of ['anniversary', 'monthiversary', 'days'] as const) {
        const [m] = upcomingMilestones(anniversary, today, { kinds: [kind], limit: 1 });
        if (m) out.push(auto(kind, milestoneLabel(m), m.date));
      }
    } else {
      out.push(auto('anniversary', 'Empieza su historia', toIsoDate(parseIsoDate(anniversary)!)));
    }
  }
  const people: [CountdownPerson | null, string, string][] = [
    [input.me, 'me', 'Tu cumple'],
    [input.partner, 'partner', `Cumple de ${input.partner?.name ?? 'tu pareja'}`],
  ];
  for (const [p, who, title] of people) {
    if (!p?.birthday) continue;
    const date = nextBirthday(p.birthday, today);
    if (!date) continue;
    out.push({ ...auto('birthday', title, date), key: `birthday:${who}` });
  }
  return sortCountdowns(out);
}

/** Todas las cuentas regresivas (automáticas + eventos), de la más próxima a la más lejana. */
export function buildCountdowns(input: CountdownInput): Countdown[] {
  return sortCountdowns([...autoCountdowns(input), ...eventCountdowns(input.events, input.today)]);
}

/** "La próxima vez que nos vemos": la visita futura más cercana (hoy cuenta), o null. */
export function nextVisit(events: readonly EventInput[], today: IsoDate): Countdown | null {
  return (
    eventCountdowns(
      events.filter((e) => e.kind === 'visit'),
      today,
    )[0] ?? null
  );
}

/**
 * Lo que muestra el widget de cuenta regresiva y la tarjeta de Inicio: la próxima visita si hay
 * (es relación a distancia, D4), si no la cuenta regresiva más próxima.
 */
export function featuredCountdown(input: CountdownInput): Countdown | null {
  return nextVisit(input.events, input.today) ?? buildCountdowns(input)[0] ?? null;
}

/** Eventos sin recurrencia que ya pasaron, del más reciente al más viejo. */
export function pastEvents<T extends EventInput>(events: readonly T[], today: IsoDate): T[] {
  return events
    .filter((e) => !(e.kind !== 'visit' && e.recurring_yearly) && e.date.slice(0, 10) < today)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

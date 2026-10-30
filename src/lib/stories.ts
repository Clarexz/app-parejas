import { parseIsoDate, todayIn } from './dates';
import { DEFAULT_TIME_ZONE } from './timezone';

/** Vida de una story: 24 horas. */
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;
export const STORY_TEXT_MAX = 280;
export const STORY_CAPTION_MAX = 140;
export const STORY_REPLY_MAX = 500;
export const STORY_MAX_STICKERS = 10;

export type StoryKind = 'photo' | 'text' | 'drawing';
export type StoryBg = 'paper' | 'postit' | 'jamaica' | 'cempasuchil' | 'nopal' | 'ink';
export type StoryFont = 'hand' | 'body' | 'stamp';

export const STORY_BGS: readonly StoryBg[] = [
  'paper',
  'postit',
  'jamaica',
  'cempasuchil',
  'nopal',
  'ink',
];
export const STORY_FONTS: readonly StoryFont[] = ['hand', 'body', 'stamp'];
export const STORY_FONT_LABELS: Record<StoryFont, string> = {
  hand: 'A mano',
  body: 'Imprenta',
  stamp: 'Máquina',
};

/** Reacciones rápidas a una story. */
export const STORY_REACTIONS: readonly string[] = ['😍', '😂', '🥹', '🔥', '😮', '❤️'];

/** Stickers (emojis) que se pueden pegar sobre una story. */
export const STORY_STICKERS: readonly string[] = [
  '🌮',
  '🌵',
  '☕',
  '🌙',
  '⭐',
  '🌸',
  '🐶',
  '🎉',
  '😘',
  '🥰',
  '😴',
  '🤪',
  '💌',
  '🍿',
  '✈️',
  '🫶',
];

/** Sticker posicionado: x,y en 0..1 (fracción del lienzo), s escala, r rotación en grados. */
export type StorySticker = { e: string; x: number; y: number; s: number; r: number };

export type StoryLike = {
  id: string;
  user_id: string;
  kind: StoryKind;
  created_at: string;
  expires_at: string;
  deleted_at: string | null;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const MONTHS = [
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

/** Una story está activa si no se borró y aún no caduca. */
export function isStoryActive(s: Pick<StoryLike, 'expires_at' | 'deleted_at'>, now: Date): boolean {
  if (s.deleted_at) return false;
  const exp = Date.parse(s.expires_at);
  return Number.isFinite(exp) && exp > now.getTime();
}

/** "hace un momento" · "hace 5 min" · "hace 3 h" · "ayer" · "12 oct". */
export function storyAgo(createdAt: string, now: Date): string {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return '';
  const diff = Math.max(0, now.getTime() - created);
  if (diff < MINUTE) return 'hace un momento';
  if (diff < HOUR) return `hace ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) return `hace ${Math.floor(diff / HOUR)} h`;
  if (diff < 2 * DAY) return 'ayer';
  const p = parseIsoDate(todayIn(DEFAULT_TIME_ZONE, new Date(created)));
  if (!p) return '';
  return `${p.day} ${MONTHS[p.month - 1].slice(0, 3)}`;
}

/** Tiempo que le queda a una story: "quedan 5 h" · "quedan 20 min" · "queda un minuto" · "ya se borró". */
export function storyTimeLeft(expiresAt: string, now: Date): string {
  const exp = Date.parse(expiresAt);
  const left = Number.isFinite(exp) ? exp - now.getTime() : 0;
  if (left <= 0) return 'ya se borró';
  if (left >= HOUR) return `quedan ${Math.floor(left / HOUR)} h`;
  if (left >= MINUTE) return `quedan ${Math.floor(left / MINUTE)} min`;
  return 'queda un minuto';
}

/**
 * Separa las stories activas en las mías y las de mi pareja (de la más vieja a la más nueva).
 * `firstUnseenIndex` es el índice en `partner` de la primera no vista (0 si todas vistas o no hay).
 */
export function groupStories<T extends StoryLike>(
  stories: T[],
  myId: string,
  partnerId: string | null,
  seenIds: ReadonlySet<string>,
  now: Date,
): { mine: T[]; partner: T[]; partnerUnseen: number; firstUnseenIndex: number } {
  const active = stories
    .filter((s) => isStoryActive(s, now))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const mine = active.filter((s) => s.user_id === myId);
  const partner = partnerId ? active.filter((s) => s.user_id === partnerId) : [];
  const partnerUnseen = partner.filter((s) => !seenIds.has(s.id)).length;
  const idx = partner.findIndex((s) => !seenIds.has(s.id));
  return { mine, partner, partnerUnseen, firstUnseenIndex: Math.max(0, idx) };
}

/** Rutas en el bucket: `<pareja>/<usuario>/<id>.jpg` y su miniatura `_thumb.jpg`. */
export function storyPaths(
  coupleId: string,
  userId: string,
  fileId: string,
): { media: string; thumb: string } {
  const base = `${coupleId}/${userId}/${fileId}`;
  return { media: `${base}.jpg`, thumb: `${base}_thumb.jpg` };
}

/** Cuánto dura cada story en el visor. */
export function storyDurationMs(kind: StoryKind): number {
  return kind === 'photo' ? 6000 : 5000;
}

export function validateStoryText(text: string): 'empty' | 'too_long' | null {
  const t = text.trim();
  if (t.length === 0) return 'empty';
  if (t.length > STORY_TEXT_MAX) return 'too_long';
  return null;
}

export function validateReply(body: string): 'empty' | 'too_long' | null {
  const t = body.trim();
  if (t.length === 0) return 'empty';
  if (t.length > STORY_REPLY_MAX) return 'too_long';
  return null;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Limita un sticker a rangos válidos: x,y 0..1; s 0.5..3; r -45..45 (entero). */
export function clampSticker(s: StorySticker): StorySticker {
  return {
    e: s.e,
    x: round3(clamp(s.x, 0, 1)),
    y: round3(clamp(s.y, 0, 1)),
    s: round3(clamp(s.s, 0.5, 3)),
    r: Math.round(clamp(s.r, -45, 45)),
  };
}

/** Agrupa por mes (en la zona dada) conservando el orden en que llegan; "octubre 2026". */
export function archiveByMonth<T extends { created_at: string }>(
  items: T[],
  timeZone: string,
): { key: string; label: string; items: T[] }[] {
  const groups: { key: string; label: string; items: T[] }[] = [];
  const byKey = new Map<string, { key: string; label: string; items: T[] }>();
  for (const item of items) {
    const ms = Date.parse(item.created_at);
    if (!Number.isFinite(ms)) continue;
    const p = parseIsoDate(todayIn(timeZone, new Date(ms)));
    if (!p) continue;
    const key = `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}`;
    let g = byKey.get(key);
    if (!g) {
      g = { key, label: `${MONTHS[p.month - 1]} ${p.year}`, items: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    g.items.push(item);
  }
  return groups;
}

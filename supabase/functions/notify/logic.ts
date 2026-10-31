// Lógica pura de la Edge Function `notify` (sin APIs de Deno ni de Node): la usan
// index.ts (Deno) y los tests de Jest.
import {
  answerCopy,
  commentCopy,
  drawingCopy,
  gameCopy,
  memoryCopy,
  moodCopy,
  nudgeCopy,
  storyCopy,
  storyReplyCopy,
  testCopy,
  type Copy,
} from './copy.ts';

export type NotifyKind =
  | 'answer'
  | 'comment'
  | 'mood'
  | 'nudge'
  | 'story'
  | 'story_reply'
  | 'memory'
  | 'game'
  | 'drawing'
  | 'widget'
  | 'test';

export type NotifyEvent = {
  kind: NotifyKind;
  coupleId: string | null;
  actor: { id: string; name: string };
  recipient: { id: string; name: string };
  tokens: string[];
  prefs: {
    answers: boolean;
    comments: boolean;
    moods: boolean;
    nudges: boolean;
    stories: boolean;
    memories: boolean;
    games: boolean;
  };
  data: Record<string, unknown>;
};

export type BuiltNotification = {
  visible: boolean;
  title?: string;
  body?: string;
  channelId: string;
  data: Record<string, string>;
};

export type FcmMessage = {
  message: {
    token: string;
    data: Record<string, string>;
    android: { priority: 'high' };
  };
};

export type FcmOutcome = 'ok' | 'invalid_token' | 'retry' | 'error';

export type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

const KINDS: readonly string[] = [
  'answer',
  'comment',
  'mood',
  'nudge',
  'story',
  'story_reply',
  'memory',
  'game',
  'drawing',
  'widget',
  'test',
];
export const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
export const TOKEN_AUDIENCE = 'https://oauth2.googleapis.com/token';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parsePerson(v: unknown): { id: string; name: string } | null {
  if (!isRecord(v) || typeof v.id !== 'string' || v.id === '') return null;
  return { id: v.id, name: typeof v.name === 'string' ? v.name : '' };
}

// Valida el JSON que manda Postgres. Devuelve null si no tiene la forma esperada.
export function parseEvent(json: unknown): NotifyEvent | null {
  if (!isRecord(json)) return null;
  if (typeof json.kind !== 'string' || !KINDS.includes(json.kind)) return null;
  const actor = parsePerson(json.actor);
  const recipient = parsePerson(json.recipient);
  if (!actor || !recipient) return null;
  if (!Array.isArray(json.tokens)) return null;
  const tokens = json.tokens.filter((t): t is string => typeof t === 'string' && t !== '');
  const p = isRecord(json.prefs) ? json.prefs : {};
  const data = isRecord(json.data) ? json.data : {};
  return {
    kind: json.kind as NotifyKind,
    coupleId: typeof json.couple_id === 'string' ? json.couple_id : null,
    actor,
    recipient,
    tokens,
    prefs: {
      answers: p.answers !== false,
      comments: p.comments !== false,
      moods: p.moods !== false,
      nudges: p.nudges !== false,
      stories: p.stories !== false,
      memories: p.memories !== false,
      games: p.games !== false,
    },
    data,
  };
}

// Hash estable y simple (suma de códigos de caracteres) para elegir la variante del texto.
export function stableSeed(id: unknown): number {
  if (typeof id !== 'string') return 0;
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return sum;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}

// Construye la notificación, o null si la persona apagó este tipo de aviso (el mood apagado
// devuelve un push de datos invisible para el widget).
export function buildNotification(event: NotifyEvent): BuiltNotification | null {
  const d = event.data;
  const base = { actor: event.actor.name, recipient: event.recipient.name };
  const data: Record<string, string> = { kind: event.kind, url: '' };
  const questionId = str(d.question_id);
  const day = str(d.day);
  if (questionId) data.question_id = questionId;
  if (day) data.day = day;

  let copy: Copy;
  let channelId = 'actividad';
  switch (event.kind) {
    case 'answer':
      if (!event.prefs.answers) return null;
      data.url = `/question?id=${questionId ?? ''}`;
      copy = answerCopy({
        ...base,
        seed: stableSeed(d.question_id),
        daily: day !== null,
        recipientAnswered: d.recipient_answered === true,
        questionText: str(d.question_text),
      });
      break;
    case 'comment': {
      if (!event.prefs.comments) return null;
      data.url = `/question?id=${questionId ?? ''}`;
      const commentId = str(d.comment_id);
      if (commentId) data.comment_id = commentId;
      copy = commentCopy({
        ...base,
        seed: stableSeed(d.comment_id),
        body: typeof d.body === 'string' ? d.body : null,
        questionText: str(d.question_text),
      });
      break;
    }
    case 'mood':
      // Con el aviso apagado igual llega un push de datos que solo refresca el widget.
      if (!event.prefs.moods) {
        return { visible: false, channelId: 'actividad', data: { kind: 'widget', scope: 'mood' } };
      }
      data.url = '/moods';
      copy = moodCopy({
        ...base,
        seed: stableSeed(d.mood_id),
        emoji: typeof d.emoji === 'string' ? d.emoji : '',
        note: str(d.note),
      });
      break;
    case 'nudge':
      if (!event.prefs.nudges) return null;
      channelId = 'toques';
      data.url = '/question';
      copy = nudgeCopy({ ...base, seed: stableSeed(d.nudge_id) });
      break;
    case 'story': {
      // Con el aviso apagado igual llega un push de datos que solo refresca el widget de story.
      if (!event.prefs.stories) {
        return { visible: false, channelId: 'actividad', data: { kind: 'widget', scope: 'story' } };
      }
      const storyId = str(d.story_id);
      if (storyId) data.story_id = storyId;
      data.url = `/story/view?user=${event.actor.id}`;
      const storyKind =
        d.story_kind === 'text' || d.story_kind === 'drawing' ? d.story_kind : 'photo';
      copy = storyCopy({
        ...base,
        seed: stableSeed(d.story_id),
        storyKind,
        text: typeof d.text === 'string' ? d.text : null,
      });
      break;
    }
    case 'story_reply': {
      if (!event.prefs.stories) return null;
      const storyId = str(d.story_id);
      if (storyId) data.story_id = storyId;
      const replyId = str(d.reply_id);
      if (replyId) data.reply_id = replyId;
      data.url = `/story/view?story=${storyId ?? ''}`;
      copy = storyReplyCopy({
        ...base,
        seed: stableSeed(d.reply_id),
        body: typeof d.body === 'string' ? d.body : '',
        toAuthor: str(d.story_author_id) === event.recipient.id,
      });
      break;
    }
    case 'memory': {
      // Sin push de datos: no hay widget de memorias. Apagado = no se manda nada.
      if (!event.prefs.memories) return null;
      const memoryId = str(d.memory_id);
      if (memoryId) data.memory_id = memoryId;
      data.url = `/memory/${memoryId ?? ''}`;
      copy = memoryCopy({
        ...base,
        seed: stableSeed(d.memory_id),
        title: typeof d.title === 'string' ? d.title : null,
        placeName: typeof d.place_name === 'string' ? d.place_name : null,
      });
      break;
    }
    case 'game': {
      // Sin push de datos: no hay widget de juegos. Apagado = no se manda nada.
      if (!event.prefs.games) return null;
      const roundId = str(d.round_id);
      if (roundId) data.round_id = roundId;
      data.url = `/game/${roundId ?? ''}`;
      const matchPct = typeof d.match_pct === 'number' ? d.match_pct : null;
      copy = gameCopy({
        ...base,
        seed: stableSeed(d.round_id),
        game: str(d.game) ?? '',
        event: d.event === 'finished' ? 'finished' : 'started',
        matchPct,
      });
      break;
    }
    case 'drawing': {
      if (!event.prefs.games) return null;
      const drawingId = str(d.drawing_id);
      if (drawingId) data.drawing_id = drawingId;
      data.url = `/drawing/${drawingId ?? ''}`;
      copy = drawingCopy({
        ...base,
        seed: stableSeed(d.drawing_id),
        event: d.event === 'solved' || d.event === 'gave_up' ? d.event : 'ready',
        word: str(d.word),
      });
      break;
    }
    case 'widget': {
      // Fase 8: cambió algo que solo ven los widgets (eventos, distancia). Siempre es un push de
      // datos sin aviso, así que no depende de ninguna preferencia.
      const scope = str(d.scope);
      return {
        visible: false,
        channelId: 'actividad',
        data: scope ? { kind: 'widget', scope } : { kind: 'widget' },
      };
    }
    case 'test':
      data.url = '/settings/notifications';
      copy = testCopy({ ...base, seed: 0 });
      break;
  }
  return { visible: true, title: copy.title, body: copy.body, channelId, data };
}

// Cuerpo de FCM HTTP v1 en el formato de expo-notifications en Android: todo va en
// `data` (valores string) y la librería muestra la notificación. Sin bloque `notification`.
export function buildFcmMessage(token: string, built: BuiltNotification): FcmMessage {
  const data: Record<string, string> = built.visible
    ? {
        title: built.title ?? '',
        message: built.body ?? '',
        body: JSON.stringify(built.data),
        channelId: built.channelId,
      }
    : { ...built.data };
  return { message: { token, data, android: { priority: 'high' } } };
}

function fcmErrorCode(json: unknown): string {
  if (!isRecord(json) || !isRecord(json.error)) return '';
  const details = Array.isArray(json.error.details) ? json.error.details : [];
  for (const det of details) {
    if (isRecord(det) && typeof det.errorCode === 'string') return det.errorCode;
  }
  return typeof json.error.status === 'string' ? json.error.status : '';
}

export function classifyFcmResponse(status: number, json: unknown): FcmOutcome {
  if (status >= 200 && status < 300) return 'ok';
  const code = fcmErrorCode(json);
  if (status === 404 || code === 'UNREGISTERED') return 'invalid_token';
  if (status === 400 && code === 'INVALID_ARGUMENT') {
    // Solo es token inválido si el error apunta al token; otro 400 es un bug nuestro.
    const msg = isRecord(json) && isRecord(json.error) ? String(json.error.message ?? '') : '';
    const mentionsToken = /token/i.test(msg) || JSON.stringify(json).includes('message.token');
    return mentionsToken ? 'invalid_token' : 'error';
  }
  if (status === 429 || status >= 500) return 'retry';
  return 'error';
}

// --- Cuenta de servicio y JWT ------------------------------------------------------------

export function parseServiceAccount(b64OrJson: string): ServiceAccount {
  const raw = b64OrJson.trim();
  let text = raw;
  if (!raw.startsWith('{')) {
    const bin = atob(raw);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    text = new TextDecoder().decode(bytes);
  }
  const obj: unknown = JSON.parse(text);
  if (
    !isRecord(obj) ||
    typeof obj.project_id !== 'string' ||
    typeof obj.client_email !== 'string' ||
    typeof obj.private_key !== 'string'
  ) {
    throw new Error('Cuenta de servicio inválida: faltan project_id, client_email o private_key');
  }
  return {
    project_id: obj.project_id,
    client_email: obj.client_email,
    private_key: obj.private_key,
    token_uri: typeof obj.token_uri === 'string' ? obj.token_uri : undefined,
  };
}

export function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Devuelve las dos primeras partes del JWT (`header.claims`); la firma se agrega aparte.
export function buildJwtParts(sa: ServiceAccount, nowSec: number): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: FCM_SCOPE,
      aud: TOKEN_AUDIENCE,
      iat: nowSec,
      exp: nowSec + 3600,
    }),
  );
  return `${header}.${claims}`;
}

export function pemToPkcs8(pem: string): Uint8Array<ArrayBuffer> {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// Comparación en tiempo constante (para el secreto compartido).
export function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

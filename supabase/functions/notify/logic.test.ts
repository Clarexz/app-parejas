/** @jest-environment node */
import { createSign, createVerify, generateKeyPairSync } from 'node:crypto';
import {
  base64UrlEncode,
  buildFcmMessage,
  buildJwtParts,
  buildNotification,
  classifyFcmResponse,
  parseEvent,
  parseServiceAccount,
  pemToPkcs8,
  timingSafeEqual,
  type NotifyEvent,
} from './logic';

function raw(
  kind: string,
  data: Record<string, unknown> = {},
  prefs: Record<string, boolean> = {},
) {
  return {
    kind,
    couple_id: 'c-1',
    actor: { id: 'u-1', name: 'Ana' },
    recipient: { id: 'u-2', name: 'Luis' },
    tokens: ['tok-aaaaaaaaaaaaaaaaaaaa'],
    prefs: {
      answers: true,
      comments: true,
      moods: true,
      nudges: true,
      stories: true,
      memories: true,
      ...prefs,
    },
    data,
  };
}
function ev(kind: string, data: Record<string, unknown> = {}, prefs: Record<string, boolean> = {}) {
  const e = parseEvent(raw(kind, data, prefs));
  if (!e) throw new Error('evento inválido');
  return e as NotifyEvent;
}

describe('parseEvent', () => {
  it('acepta un evento válido', () => {
    const e = parseEvent(raw('mood', { emoji: '😀' }));
    expect(e?.kind).toBe('mood');
    expect(e?.recipient.name).toBe('Luis');
    expect(e?.tokens).toHaveLength(1);
  });
  it('rechaza basura', () => {
    expect(parseEvent(null)).toBeNull();
    expect(parseEvent('x')).toBeNull();
    expect(parseEvent({ ...raw('otro') })).toBeNull();
    expect(parseEvent({ ...raw('mood'), actor: null })).toBeNull();
    expect(parseEvent({ ...raw('mood'), tokens: 'x' })).toBeNull();
  });
  it('filtra tokens no string', () => {
    const e = parseEvent({ ...raw('test'), tokens: ['a', 3, null, ''] });
    expect(e?.tokens).toEqual(['a']);
  });
});

describe('buildNotification', () => {
  it('devuelve null con la preferencia apagada', () => {
    expect(buildNotification(ev('answer', {}, { answers: false }))).toBeNull();
    expect(buildNotification(ev('comment', {}, { comments: false }))).toBeNull();
    expect(buildNotification(ev('nudge', {}, { nudges: false }))).toBeNull();
  });
  it('mood con el aviso apagado manda un push de datos para el widget', () => {
    const b = buildNotification(ev('mood', { emoji: '😀' }, { moods: false }));
    expect(b).toEqual({
      visible: false,
      channelId: 'actividad',
      data: { kind: 'widget', scope: 'mood' },
    });
    const { message } = buildFcmMessage('tok', b!);
    expect(message.data).toEqual({ kind: 'widget', scope: 'mood' });
  });
  it('story con el aviso apagado manda un push de datos para el widget', () => {
    const b = buildNotification(ev('story', { story_id: 's1' }, { stories: false }));
    expect(b).toEqual({
      visible: false,
      channelId: 'actividad',
      data: { kind: 'widget', scope: 'story' },
    });
  });
  it('widget (eventos/distancia) siempre es un push de datos, sin importar preferencias', () => {
    const off = { answers: false, comments: false, moods: false, nudges: false, stories: false };
    for (const scope of ['events', 'distance']) {
      const b = buildNotification(ev('widget', { scope }, off));
      expect(b).toEqual({
        visible: false,
        channelId: 'actividad',
        data: { kind: 'widget', scope },
      });
      expect(buildFcmMessage('tok', b!).message.data).toEqual({ kind: 'widget', scope });
    }
    // El evento de widget llega con prefs vacías desde send_widget_push.
    const bare = parseEvent({ ...raw('widget', {}), prefs: {} });
    expect(bare && buildNotification(bare)?.data).toEqual({ kind: 'widget' });
  });
  it('story_reply con el aviso apagado no manda nada', () => {
    expect(buildNotification(ev('story_reply', { story_id: 's1' }, { stories: false }))).toBeNull();
  });
  it('story: copy, ruta al perfil de quien la pegó y canal', () => {
    const b = buildNotification(ev('story', { story_id: 's1', story_kind: 'text', text: 'Hola' }));
    expect(b?.visible).toBe(true);
    expect(b?.channelId).toBe('actividad');
    expect(b?.title).toContain('Ana');
    expect(b?.body).toBe('Hola');
    expect(b?.data).toEqual({ kind: 'story', url: '/story/view?user=u-1', story_id: 's1' });
    const photo = buildNotification(ev('story', { story_id: 's2', story_kind: 'photo' }));
    expect(photo?.title).toBe('Ana pegó una story');
  });
  it('story_reply: ruta a la story y copy según si quien recibe es el autor', () => {
    const toAuthor = buildNotification(
      ev('story_reply', {
        story_id: 's1',
        reply_id: 'r1',
        body: 'Qué lindo',
        story_author_id: 'u-2',
      }),
    );
    expect(toAuthor?.title).toMatch(/Ana.*tu story/);
    expect(toAuthor?.body).toBe('Qué lindo');
    expect(toAuthor?.data).toEqual({
      kind: 'story_reply',
      url: '/story/view?story=s1',
      story_id: 's1',
      reply_id: 'r1',
    });
    const toOther = buildNotification(
      ev('story_reply', {
        story_id: 's1',
        reply_id: 'r1',
        body: 'Gracias',
        story_author_id: 'u-1',
      }),
    );
    expect(toOther?.title).not.toMatch(/tu story/);
  });
  it('prefs.stories se interpreta como encendido si falta', () => {
    const e = parseEvent({ ...raw('story'), prefs: { answers: true } });
    expect(e?.prefs.stories).toBe(true);
    expect(parseEvent(raw('story', {}, { stories: false }))?.prefs.stories).toBe(false);
  });
  it('memory con el aviso apagado no manda nada (ni push de datos)', () => {
    expect(buildNotification(ev('memory', { memory_id: 'm1' }, { memories: false }))).toBeNull();
  });
  it('memory: copy, ruta a la memoria y canal', () => {
    const b = buildNotification(
      ev('memory', { memory_id: 'm1', title: 'Playa en Mazatlán', place_name: 'Malecón' }),
    );
    expect(b?.visible).toBe(true);
    expect(b?.channelId).toBe('actividad');
    expect(b?.title).toContain('Ana');
    expect(b?.body).toContain('Playa en Mazatlán');
    expect(b?.data).toEqual({ kind: 'memory', url: '/memory/m1', memory_id: 'm1' });
  });
  it('prefs.memories se interpreta como encendido si falta', () => {
    const e = parseEvent({ ...raw('memory'), prefs: { answers: true } });
    expect(e?.prefs.memories).toBe(true);
    expect(parseEvent(raw('memory', {}, { memories: false }))?.prefs.memories).toBe(false);
  });
  it('test ignora las preferencias', () => {
    const b = buildNotification(
      ev(
        'test',
        {},
        {
          answers: false,
          comments: false,
          moods: false,
          nudges: false,
          stories: false,
          memories: false,
        },
      ),
    );
    expect(b?.visible).toBe(true);
    expect(b?.data.url).toBe('/settings/notifications');
  });
  it('rutas y canales', () => {
    const a = buildNotification(
      ev('answer', { question_id: 'q1', day: '2026-11-02', question_text: '¿Qué tal?' }),
    );
    expect(a?.channelId).toBe('actividad');
    expect(a?.data).toMatchObject({ kind: 'answer', url: '/question?id=q1', question_id: 'q1' });
    expect(a?.data.day).toBe('2026-11-02');
    const c = buildNotification(
      ev('comment', { question_id: 'q1', comment_id: 'c9', body: 'hola' }),
    );
    expect(c?.data.url).toBe('/question?id=q1');
    expect(c?.data.comment_id).toBe('c9');
    expect(buildNotification(ev('mood', { mood_id: 'm1', emoji: '😀' }))?.data.url).toBe('/moods');
    const n = buildNotification(ev('nudge', { nudge_id: 'n1' }));
    expect(n?.channelId).toBe('toques');
    expect(n?.data.url).toBe('/question');
  });
  it('comentario sin body no revela texto', () => {
    const b = buildNotification(ev('comment', { question_id: 'q1', comment_id: 'c9', body: null }));
    expect(b?.title).toBeTruthy();
    expect(b?.body).toMatch(/contest/i);
  });
  it('es determinista por id', () => {
    const d = { mood_id: 'abc', emoji: '😀' };
    expect(buildNotification(ev('mood', d))).toEqual(buildNotification(ev('mood', d)));
  });
});

describe('buildFcmMessage', () => {
  it('formato visible para expo-notifications', () => {
    const built = buildNotification(ev('nudge', { nudge_id: 'n1' }))!;
    const { message } = buildFcmMessage('tok', built);
    expect(message.token).toBe('tok');
    expect(message.android.priority).toBe('high');
    expect(message).not.toHaveProperty('notification');
    expect(message.data.title).toBe(built.title);
    expect(message.data.message).toBe(built.body);
    expect(message.data.channelId).toBe('toques');
    expect(JSON.parse(message.data.body)).toEqual(built.data);
    for (const v of Object.values(message.data)) expect(typeof v).toBe('string');
  });
  it('mensaje solo de datos', () => {
    const { message } = buildFcmMessage('tok', {
      visible: false,
      channelId: 'actividad',
      data: { kind: 'mood', url: '/moods' },
    });
    expect(message.data).toEqual({ kind: 'mood', url: '/moods' });
    expect(message.data).not.toHaveProperty('title');
    expect(message.android.priority).toBe('high');
  });
});

describe('classifyFcmResponse', () => {
  it('clasifica', () => {
    expect(classifyFcmResponse(200, { name: 'x' })).toBe('ok');
    expect(classifyFcmResponse(404, { error: { status: 'NOT_FOUND' } })).toBe('invalid_token');
    expect(
      classifyFcmResponse(404, {
        error: { details: [{ errorCode: 'UNREGISTERED' }] },
      }),
    ).toBe('invalid_token');
    expect(
      classifyFcmResponse(400, {
        error: {
          status: 'INVALID_ARGUMENT',
          message: 'The registration token is not a valid FCM registration token',
        },
      }),
    ).toBe('invalid_token');
    expect(
      classifyFcmResponse(400, {
        error: { status: 'INVALID_ARGUMENT', message: 'Invalid value at message.data' },
      }),
    ).toBe('error');
    expect(classifyFcmResponse(429, null)).toBe('retry');
    expect(classifyFcmResponse(503, null)).toBe('retry');
    expect(classifyFcmResponse(401, null)).toBe('error');
    expect(classifyFcmResponse(403, {})).toBe('error');
  });
});

describe('JWT y cuenta de servicio', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  const sa = {
    project_id: 'proj',
    client_email: 'sa@proj.iam.gserviceaccount.com',
    private_key: pem,
  };

  it('parseServiceAccount acepta JSON y base64', () => {
    const text = JSON.stringify({ ...sa, extra: 1 });
    expect(parseServiceAccount(text).project_id).toBe('proj');
    expect(parseServiceAccount(Buffer.from(text).toString('base64')).client_email).toBe(
      sa.client_email,
    );
    expect(() => parseServiceAccount('{"a":1}')).toThrow();
  });

  it('buildJwtParts arma header y claims', () => {
    const [h, c] = buildJwtParts(sa, 1000).split('.');
    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({
      alg: 'RS256',
      typ: 'JWT',
    });
    expect(JSON.parse(Buffer.from(c, 'base64url').toString())).toEqual({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1000,
      exp: 4600,
    });
  });

  it('base64UrlEncode no usa +, / ni =', () => {
    expect(base64UrlEncode(new Uint8Array([251, 255, 254]))).toBe('-__-');
    expect(base64UrlEncode('a')).toBe('YQ');
  });

  it('pemToPkcs8 + firma RS256 verificable', async () => {
    const der = pemToPkcs8(pem);
    const key = await globalThis.crypto.subtle.importKey(
      'pkcs8',
      der as BufferSource,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const unsigned = buildJwtParts(sa, 1000);
    const sig = new Uint8Array(
      await globalThis.crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        key,
        new TextEncoder().encode(unsigned),
      ),
    );
    const ok = createVerify('RSA-SHA256')
      .update(unsigned)
      .verify(publicKey, Buffer.from(base64UrlEncode(sig), 'base64url'));
    expect(ok).toBe(true);
    // Control: createSign de Node produce la misma firma (PKCS1 v1.5 es determinista).
    const ref = createSign('RSA-SHA256').update(unsigned).sign(privateKey);
    expect(Buffer.from(sig).equals(ref)).toBe(true);
  });
});

describe('timingSafeEqual', () => {
  it('compara', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(timingSafeEqual('', '')).toBe(true);
  });
});

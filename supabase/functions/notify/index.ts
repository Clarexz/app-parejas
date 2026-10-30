// Edge Function `notify`: recibe el evento de Postgres (pg_net) y manda el push por FCM HTTP v1.
// Protegida con el secreto compartido `x-notify-secret` (JWT desactivado en el servidor).
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
  type FcmOutcome,
  type ServiceAccount,
} from './logic.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let cachedSa: ServiceAccount | null = null;
let cachedAccess: { token: string; expiresAt: number } | null = null;

function serviceAccount(): ServiceAccount {
  if (cachedSa) return cachedSa;
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_B64');
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 no está configurado');
  cachedSa = parseServiceAccount(raw);
  return cachedSa;
}

async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  // Se renueva 5 minutos antes de que expire.
  if (cachedAccess && cachedAccess.expiresAt - 300 > now) return cachedAccess.token;

  const unsigned = buildJwtParts(sa, now);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64UrlEncode(new Uint8Array(sig))}`;

  const res = await fetch(sa.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || typeof body.access_token !== 'string') {
    throw new Error(`OAuth de Google falló (${res.status})`);
  }
  const ttl = typeof body.expires_in === 'number' ? body.expires_in : 3600;
  cachedAccess = { token: body.access_token, expiresAt: now + ttl };
  return body.access_token;
}

async function sendOne(
  sa: ServiceAccount,
  access: string,
  token: string,
  payload: unknown,
): Promise<FcmOutcome> {
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      const outcome = classifyFcmResponse(res.status, body);
      if (outcome === 'retry' && attempt === 0) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      if (outcome === 'error' || outcome === 'retry') {
        console.error(`FCM ${res.status} para ...${token.slice(-6)}`);
        if (res.status === 401) cachedAccess = null;
      }
      return outcome;
    } catch (e) {
      console.error('FCM fetch falló:', e instanceof Error ? e.message : 'desconocido');
      if (attempt === 1) return 'error';
    }
  }
  return 'error';
}

async function deleteTokens(tokens: string[]): Promise<void> {
  const base = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) {
    console.error('No se pueden borrar tokens inválidos: falta SUPABASE_URL o service role');
    return;
  }
  try {
    const res = await fetch(`${base}/rest/v1/rpc/delete_push_tokens`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_tokens: tokens }),
    });
    if (!res.ok) console.error(`delete_push_tokens respondió ${res.status}`);
  } catch (e) {
    console.error('delete_push_tokens falló:', e instanceof Error ? e.message : 'desconocido');
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const expected = Deno.env.get('NOTIFY_SECRET');
  if (!expected) return json(500, { error: 'notify_secret_not_configured' });
  if (!timingSafeEqual(req.headers.get('x-notify-secret') ?? '', expected)) {
    return json(401, { error: 'unauthorized' });
  }

  const event = parseEvent(await req.json().catch(() => null));
  if (!event) return json(400, { error: 'invalid_event' });

  const built = buildNotification(event);
  if (!built || event.tokens.length === 0) {
    return json(200, { sent: 0, invalid: 0, skipped: event.tokens.length || 1 });
  }

  let sa: ServiceAccount;
  let access: string;
  try {
    sa = serviceAccount();
    access = await accessToken(sa);
  } catch (e) {
    console.error('Sin credenciales de FCM:', e instanceof Error ? e.message : 'desconocido');
    return json(500, { error: 'fcm_auth_failed' });
  }

  let sent = 0;
  let skipped = 0;
  const invalid: string[] = [];
  for (const token of event.tokens) {
    const outcome = await sendOne(sa, access, token, buildFcmMessage(token, built));
    if (outcome === 'ok') sent++;
    else if (outcome === 'invalid_token') invalid.push(token);
    else skipped++;
  }
  if (invalid.length > 0) await deleteTokens(invalid);

  console.log(`notify ${event.kind}: sent=${sent} invalid=${invalid.length} skipped=${skipped}`);
  return json(200, { sent, invalid: invalid.length, skipped });
});

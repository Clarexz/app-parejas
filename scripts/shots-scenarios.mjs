// Escenarios de QA visual: un servidor Supabase simulado dentro de Playwright, para capturar
// pantallas que exigen sesión sin tocar el código de la app. Lo usa `scripts/shots.mjs`.
//
// Cada escenario decide qué ve la app (sesión, perfil, pareja) y qué rutas se capturan.
// Se responden con `context.route` las llamadas a REST, Auth y Storage del host simulado.

export const SHOTS_SUPABASE_URL = 'https://shots.supabase.test';
export const SHOTS_ANON_KEY = 'shots';
// supabase-js guarda la sesión en `sb-<primer-segmento-del-host>-auth-token`.
const STORAGE_KEY = 'sb-shots-auth-token';

const ME_ID = '11111111-1111-4111-8111-111111111111';
const PARTNER_ID = '22222222-2222-4222-8222-222222222222';
const COUPLE_ID = '33333333-3333-4333-8333-333333333333';
const EMAIL = 'ale@ejemplo.mx';

const profiles = {
  me: {
    id: ME_ID,
    display_name: 'Ale',
    nickname: 'Alita',
    birthday: '1996-08-03',
    avatar_path: null,
    created_at: '2026-10-01T12:00:00Z',
  },
  partner: {
    id: PARTNER_ID,
    display_name: 'Caleb',
    nickname: null,
    birthday: '1995-05-20',
    avatar_path: `${PARTNER_ID}/1.jpg`,
    created_at: '2026-10-01T12:00:00Z',
  },
};

const couple = {
  id: COUPLE_ID,
  anniversary_date: '2023-02-14',
  created_at: '2026-10-01T12:00:00Z',
  invite_code: 'KM7Q2P',
  photo_path: `couples/${COUPLE_ID}/1.jpg`,
  spicy_enabled: false,
  timezone: 'America/Mexico_City',
};

const member = (user_id) => ({
  couple_id: COUPLE_ID,
  user_id,
  joined_at: '2026-10-01T12:00:00Z',
  spicy_opt_in: false,
});

/** Escenarios: qué datos devuelve el "servidor" y qué rutas se capturan. */
export const SCENARIOS = {
  signed_out: {
    session: false,
    routes: ['/sign-in', '/sign-up', '/forgot-password'],
  },
  profile: {
    me: { ...profiles.me, display_name: null, nickname: null, birthday: null },
    members: [],
    routes: ['/profile'],
  },
  couple: {
    me: profiles.me,
    members: [],
    routes: ['/couple', '/join'],
  },
  waiting: {
    me: profiles.me,
    members: [member(ME_ID)],
    routes: ['/waiting'],
  },
  ready: {
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    routes: ['/', '/more', '/settings/profile', '/settings/couple'],
  },
};

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

function sessionPayload() {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10;
  const user = {
    id: ME_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: EMAIL,
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-10-01T12:00:00Z',
  };
  const accessToken = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({
    sub: ME_ID,
    role: 'authenticated',
    aud: 'authenticated',
    email: EMAIL,
    exp,
  })}.firma`;
  return {
    access_token: accessToken,
    refresh_token: 'refresh-shots',
    token_type: 'bearer',
    expires_in: exp - Math.floor(Date.now() / 1000),
    expires_at: exp,
    user,
  };
}

// Foto de ejemplo (SVG "cerro y sol") para los avatares y la foto de pareja.
const PHOTO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#BFE0E8"/><circle cx="290" cy="110" r="46" fill="#F2B25A"/>
<path d="M0 400V270q90-110 190-30t210-50v210z" fill="#6FA070"/><path d="M0 400V330q120-70 230-10t170-20v100z" fill="#4F7A4A"/></svg>`;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'access-control-expose-headers': '*',
};

/** Aplica el escenario: siembra la sesión y responde al servidor simulado. */
export async function applyScenario(context, scenario) {
  const withSession = scenario.session !== false;
  if (withSession) {
    const payload = sessionPayload();
    await context.addInitScript(
      ([key, value]) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // sin localStorage: la captura saldrá sin sesión
        }
      },
      [STORAGE_KEY, JSON.stringify(payload)],
    );
  }

  const json = (route, body, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: CORS,
      body: JSON.stringify(body),
    });

  // PostgREST: `.single()` pide un objeto; `.maybeSingle()` y los listados, un arreglo.
  const rows = (route, request, list) => {
    const wantsObject = (request.headers().accept ?? '').includes('pgrst.object');
    if (wantsObject) {
      return list.length === 1
        ? json(route, list[0])
        : json(route, { code: 'PGRST116', message: 'sin filas', details: '', hint: '' }, 406);
    }
    return json(route, list);
  };

  const people = [scenario.me, scenario.partner].filter(Boolean);

  await context.route(`${SHOTS_SUPABASE_URL}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS });
    }

    if (path === '/auth/v1/user') {
      return withSession
        ? json(route, sessionPayload().user)
        : json(route, { msg: 'sin sesión' }, 401);
    }
    if (path === '/auth/v1/token') return json(route, sessionPayload());
    if (path.startsWith('/auth/v1/')) return json(route, {});

    if (path === '/rest/v1/profiles') {
      // Filtros de PostgREST que usa la app: id=eq.<uuid> o id=in.(<uuid>,<uuid>).
      const idFilter = url.searchParams.get('id') ?? '';
      const list = people.filter(
        (p) => idFilter === `eq.${p.id}` || (idFilter.startsWith('in.') && idFilter.includes(p.id)),
      );
      return rows(route, request, list);
    }
    if (path === '/rest/v1/couple_members') {
      const userFilter = url.searchParams.get('user_id');
      const list = userFilter
        ? (scenario.members ?? []).filter((m) => userFilter === `eq.${m.user_id}`)
        : (scenario.members ?? []);
      return rows(route, request, list);
    }
    if (path === '/rest/v1/couples') {
      return rows(route, request, (scenario.members ?? []).length ? [couple] : []);
    }

    // Storage: URL firmada que apunta al mismo host simulado.
    if (request.method() === 'POST' && path.startsWith('/storage/v1/object/sign/')) {
      const objectPath = path.replace('/storage/v1', '');
      return json(route, { signedURL: `${objectPath}?token=shots` });
    }
    if (path.startsWith('/storage/v1/object/')) {
      return route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        headers: CORS,
        body: PHOTO_SVG,
      });
    }

    return json(route, {});
  });

  // Realtime no se necesita: se cierra el websocket para que no reintente.
  await context.routeWebSocket(/shots\.supabase\.test/, (ws) => ws.close());
}

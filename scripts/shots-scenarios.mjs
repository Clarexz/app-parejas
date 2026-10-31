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

const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();
const mood = (id, user_id, emoji, note, ago) => ({
  id: `44444444-4444-4444-8444-${String(id).padStart(12, '0')}`,
  couple_id: COUPLE_ID,
  user_id,
  emoji,
  note,
  created_at: minutesAgo(ago),
});

// Moods de ejemplo (más nuevo primero), de ambos y de varios días.
const sampleMoods = () => [
  mood(1, ME_ID, '🥰', 'Con tacos en el camino a casa', 25),
  mood(2, PARTNER_ID, '😴', 'Hoy ni con tres cafés', 130),
  mood(3, ME_ID, '😅', null, 60 * 9),
  mood(4, PARTNER_ID, '🤩', 'Ya casi sale el viaje', 60 * 26),
  mood(5, ME_ID, '😌', 'Domingo de no hacer nada', 60 * 30),
  mood(6, PARTNER_ID, '😢', null, 60 * 24 * 3),
  mood(7, ME_ID, '🤗', 'Necesito un abrazo largo', 60 * 24 * 3 + 40),
  mood(8, PARTNER_ID, '🫠', null, 60 * 24 * 9),
];

/** ISO 'YYYY-MM-DD' de hoy (Ciudad de México) menos `n` días. */
const isoDaysAgo = (n) => {
  const d = new Date(Date.now() - n * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(d);
};

// --- Preguntas (Fase 3) -----------------------------------------------------------------------

const CATEGORIES = [
  [
    'conocernos',
    'Conocernos',
    '🔎',
    'ligera',
    'Gustos, manías y detalles chiquitos que todavía no se saben.',
  ],
  ['recuerdos', 'Recuerdos', '📷', 'ligera', 'Lo que ya vivieron (juntos y antes de conocerse).'],
  ['a-distancia', 'A distancia', '✈️', 'profunda', 'Para cuando hay kilómetros de por medio.'],
  ['amor', 'Amor', '💌', 'profunda', 'Cómo se quieren, cómo se lo demuestran.'],
  ['futuro', 'Nuestro futuro', '🧭', 'profunda', 'Planes, sueños y lo que viene.'],
  ['divertidas', 'Divertidas', '🎈', 'ligera', 'Para reírse un rato.'],
  [
    'picantes',
    'Picantes',
    '🌶️',
    'picante',
    'Solo si los dos la activan. Deseo, química y confianza.',
  ],
].map(([slug, name, emoji, intensity, description], i) => ({
  slug,
  name,
  emoji,
  intensity,
  description,
  position: i + 1,
  created_at: '2026-10-01T12:00:00Z',
}));

const qid = (n) => `55555555-5555-4555-8555-${String(n).padStart(12, '0')}`;
const answerInfo = (n, user_id, text, choice = null) => ({
  id: qid(900 + n),
  user_id,
  text,
  choice,
  created_at: minutesAgo(60),
  updated_at: minutesAgo(60),
});
const card = (n, category, category_name, text, { day, mine, partner, options = null } = {}) => ({
  question: {
    id: qid(n),
    slug: `q-${n}`,
    category,
    category_name,
    category_emoji: '💬',
    type: options ? 'choice' : 'open',
    text,
    options,
    intensity: 'ligera',
  },
  day: day ?? null,
  mine: mine ? answerInfo(n, ME_ID, mine.text, mine.choice ?? null) : null,
  partner: partner ? answerInfo(n + 50, PARTNER_ID, partner.text, partner.choice ?? null) : null,
  partner_answered: !!partner,
  comment_count: 0,
  last_activity: minutesAgo(60 * n),
});

const sampleHistory = () => [
  card(
    1,
    'conocernos',
    'Conocernos',
    '¿Qué canción te transporta a un momento exacto de tu vida?',
    {
      day: isoDaysAgo(1),
      mine: {
        text: 'Cada vez que escucho "Fuimos" de Café Tacvba me acuerdo del camión a la prepa.',
      },
      partner: { text: 'Cualquiera de Soda Stereo. Mi papá las ponía en el carro los domingos.' },
    },
  ),
  card(2, 'divertidas', 'Divertidas', '¿Qué superpoder inútil te gustaría tener?', {
    day: isoDaysAgo(2),
    mine: { text: 'Saber siempre cuál es la fila más rápida del súper.' },
    partner: { text: 'Que el café nunca se enfríe.' },
  }),
  card(3, 'amor', 'Amor', '¿Qué gesto pequeño te hace sentir más querido?', {
    mine: { text: 'Que me guardes el último pedazo de pan dulce sin que yo lo pida.' },
    partner: { text: 'Que me escribas "ya llegué" aunque sea una cuadra.' },
  }),
  card(4, 'futuro', 'Nuestro futuro', '¿Dónde les gustaría pasar un invierno completo?', {
    day: isoDaysAgo(4),
    partner: { text: 'En una casita en Oaxaca, con chocolate caliente todos los días.' },
  }),
  card(5, 'recuerdos', 'Recuerdos', '¿Cuál fue su primera salida juntos?', {
    day: isoDaysAgo(5),
    mine: { text: 'Los tacos de la esquina y una caminata larga sin rumbo.' },
  }),
];

const sampleCategoryQuestions = () =>
  [
    ['¿Cuál es tu desayuno ideal de domingo?', true, true],
    ['¿Qué cosa nunca te cansarías de comer?', true, false],
    ['¿Qué manía tuya crees que nadie ha notado?', false, true],
    ['¿Qué aprendiste a cocinar y de quién?', false, false],
    ['¿Cuál es tu lugar favorito de tu casa y por qué?', false, false],
  ].map(([text, answered_by_me, answered_by_partner], i) => ({
    id: qid(100 + i),
    slug: `conocernos-${i}`,
    type: 'open',
    text,
    options: null,
    intensity: 'ligera',
    answered_by_me,
    answered_by_partner,
  }));

const streakWith = (current, best, missing) => ({
  current,
  best,
  today: isoDaysAgo(0),
  today_done: false,
  missing_days: missing.map(isoDaysAgo),
});

const dailyCard = () =>
  card(
    1,
    'conocernos',
    'Conocernos',
    '¿Qué canción te transporta a un momento exacto de tu vida?',
    {
      day: isoDaysAgo(0),
      partner: { text: 'Cualquiera de Soda Stereo.' },
    },
  );

// --- Pantalla de pregunta e Inicio (Fase 3) ---------------------------------------------------

const TODAY_TEXT = '¿Qué canción te transporta a un momento exacto de tu vida?';
const CHOICE_OPTIONS = ['Playa', 'Montaña', 'Ciudad grande', 'Pueblo chiquito'];
const withComments = (c, comment_count) => ({ ...c, comment_count });
const todayCard = (state, extra = {}) =>
  withComments(
    card(1, 'conocernos', 'Conocernos', TODAY_TEXT, {
      day: isoDaysAgo(0),
      mine: state === 'unanswered' || state === 'unanswered_partner_done' ? undefined : mineAnswer,
      partner: state === 'waiting' || state === 'unanswered' ? undefined : partnerAnswer,
    }),
    extra.comment_count ?? 0,
  );
const mineAnswer = {
  text: 'Cada vez que escucho "Fuimos" de Café Tacvba me acuerdo del camión a la prepa.',
};
const partnerAnswer = {
  text: 'Cualquiera de Soda Stereo. Mi papá las ponía en el carro los domingos.',
};
const choiceCard = (mine, partner) =>
  card(7, 'divertidas', 'Divertidas', 'Si mañana pudieran escaparse, ¿a dónde se van?', {
    day: isoDaysAgo(0),
    options: CHOICE_OPTIONS,
    mine,
    partner,
  });
const comment = (n, user_id, body, ago, reactions = {}) => ({
  id: `66666666-6666-4666-8666-${String(n).padStart(12, '0')}`,
  couple_id: COUPLE_ID,
  question_id: qid(1),
  user_id,
  body,
  reactions,
  created_at: minutesAgo(ago),
});
const sampleComments = () => [
  comment(1, PARTNER_ID, 'Jajaja, ¿el camión de la prepa? Eso no me lo habías contado.', 42, {
    [ME_ID]: '😂',
    [PARTNER_ID]: '🥹',
  }),
  comment(
    2,
    ME_ID,
    'Es que tenía cara de que iba a llover y nunca llovía. Te lo cuento completo en la cena.',
    30,
  ),
  comment(3, PARTNER_ID, 'Pide los tacos que te gustan, yo invito.', 12, { [ME_ID]: '❤️' }),
];

// --- Stories (Fase 6) -------------------------------------------------------------------------

const sid = (n) => `88888888-8888-4888-8888-${String(n).padStart(12, '0')}`;
const hoursAgo = (h) => minutesAgo(Math.round(h * 60));
const inHours = (h) => new Date(Date.now() + h * 3_600_000).toISOString();

/** Corazón vectorial en el lienzo de 900 x 1600 (puntos planos enteros). */
const heartStroke = (cx, cy, k, c, w) => {
  const p = [];
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    p.push(Math.round(cx + x * k), Math.round(cy - y * k));
  }
  return { c, w, p };
};
const waveStroke = (y0, amp, c, w, o) => {
  const p = [];
  for (let i = 0; i <= 30; i++) {
    p.push(60 + i * 26, Math.round(y0 + Math.sin(i / 2.2) * amp));
  }
  return { c, w, ...(o ? { o } : {}), p };
};
const sampleStrokes = () => [
  waveStroke(300, 70, 'cempasuchil', 40, 0.4),
  heartStroke(450, 760, 22, 'jamaica', 18),
  waveStroke(1250, 50, 'ink', 8),
  { c: 'nopal', w: 18, p: [140, 1380, 260, 1330, 380, 1390, 500, 1330, 640, 1390, 760, 1340] },
];

/** Fila de story; `ago` en horas (la caducidad es creada + 24 h). */
const storyRow = (n, userId, kind, o = {}) => {
  const created = o.createdAt ?? hoursAgo(o.ago ?? 1);
  return {
    id: sid(n),
    couple_id: COUPLE_ID,
    user_id: userId,
    kind,
    media_path: kind === 'photo' ? `${COUPLE_ID}/${userId}/${n}.jpg` : null,
    thumb_path: kind === 'photo' ? `${COUPLE_ID}/${userId}/${n}_thumb.jpg` : null,
    text: o.text ?? null,
    bg: kind === 'photo' ? null : (o.bg ?? 'paper'),
    font: kind === 'text' ? (o.font ?? 'hand') : null,
    strokes: kind === 'drawing' ? (o.strokes ?? sampleStrokes()) : null,
    stickers: o.stickers ?? [],
    created_at: created,
    expires_at: o.expiresAt ?? new Date(Date.parse(created) + 24 * 3_600_000).toISOString(),
    deleted_at: null,
    views: (o.views ?? []).map(([user_id, ago]) => ({ user_id, seen_at: hoursAgo(ago) })),
    reactions: (o.reactions ?? []).map(([user_id, emoji]) => ({ user_id, emoji })),
    replies: (o.replies ?? []).map(([user_id, body, ago], i) => ({
      id: `99999999-9999-4999-8999-${String(n * 10 + i).padStart(12, '0')}`,
      story_id: sid(n),
      couple_id: COUPLE_ID,
      user_id,
      body,
      created_at: hoursAgo(ago),
    })),
  };
};

// Tu pareja: un texto sin ver (hace ~2 h) y una foto sin ver (hace ~40 min). Tuyas: un dibujo ya
// visto con reacción y respuestas, y un texto que todavía no ve.
const sampleStories = () => [
  storyRow(1, PARTNER_ID, 'text', {
    ago: 2.2,
    text: 'Hoy me acordé de ti cuando pasé por el puesto de las quesadillas.',
    bg: 'postit',
    font: 'hand',
    stickers: [{ e: '🌮', x: 0.78, y: 0.82, s: 1.6, r: 12 }],
  }),
  storyRow(2, PARTNER_ID, 'photo', {
    ago: 0.7,
    text: 'Domingo de pan dulce',
    stickers: [{ e: '☕', x: 0.2, y: 0.2, s: 1.8, r: -10 }],
  }),
  storyRow(3, ME_ID, 'drawing', {
    ago: 5,
    bg: 'paper',
    stickers: [{ e: '⭐', x: 0.82, y: 0.14, s: 1.4, r: 10 }],
    views: [[PARTNER_ID, 4.5]],
    reactions: [[PARTNER_ID, '😍']],
    replies: [
      [PARTNER_ID, 'Está bien bonito el corazón. Lo imprimo.', 4.4],
      [ME_ID, 'Jajaja ya sabía que lo ibas a decir.', 4.2],
    ],
  }),
  storyRow(4, ME_ID, 'text', {
    ago: 1.5,
    text: 'Pan dulce a las 8 p. m., ¿quién dijo que no?',
    bg: 'jamaica',
    font: 'body',
  }),
];

// Archivo: mías, activas y caducadas de varios meses.
const sampleArchive = () => [
  storyRow(4, ME_ID, 'text', {
    ago: 1.5,
    text: 'Pan dulce a las 8 p. m., ¿quién dijo que no?',
    bg: 'jamaica',
    font: 'body',
  }),
  storyRow(3, ME_ID, 'drawing', { ago: 5, views: [[PARTNER_ID, 4.5]] }),
  storyRow(11, ME_ID, 'photo', { ago: 30, text: 'Camino a casa' }),
  storyRow(12, ME_ID, 'text', {
    ago: 24 * 4,
    text: 'Primer día de lluvia y ya quiero sopa.',
    bg: 'nopal',
    font: 'stamp',
  }),
  storyRow(13, ME_ID, 'drawing', { ago: 24 * 12, bg: 'ink' }),
  storyRow(14, ME_ID, 'text', {
    ago: 24 * 40,
    text: 'Feliz mes. Gracias por aguantarme.',
    bg: 'cempasuchil',
    font: 'hand',
  }),
  storyRow(15, ME_ID, 'photo', { ago: 24 * 45, text: 'Atardecer en la azotea' }),
];

/** Escenarios: qué datos devuelve el "servidor" y qué rutas se capturan. */
export const SCENARIOS = {
  // Cómo agregar widgets (Fase 5): pantalla con la pareja lista (prefijo `widgets-`).
  widgets: {
    prefix: 'widgets',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    moods: sampleMoods,
    routes: ['/widgets'],
  },

  // Stories (Fase 6): pestaña con la pareja sin ver y las mías (prefijo `stories-`).
  stories_pestana: {
    prefix: 'stories',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    stories: sampleStories,
    routes: ['/stories'],
    actions: {
      '/stories': async (page) => {
        await page.waitForTimeout(500);
      },
    },
  },
  // Sheet "Pegar una story" abierto.
  stories_hoja: {
    prefix: 'stories-hoja',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    stories: sampleStories,
    routes: ['/stories'],
    actions: {
      '/stories': async (page) => {
        await page.getByRole('button', { name: 'Pegar una story' }).click();
        await page.waitForTimeout(900);
      },
    },
  },
  stories_vacio: {
    prefix: 'stories-vacio',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    stories: () => [],
    routes: ['/stories', '/'],
  },
  stories_error: {
    prefix: 'stories-error',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    storiesError: true,
    routes: ['/stories'],
  },
  // Inicio con la fila de stories (pareja con stories sin ver).
  stories_inicio: {
    prefix: 'stories-inicio',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    moods: sampleMoods,
    stories: sampleStories,
    routes: ['/'],
  },
  stories_crear_texto: {
    prefix: 'stories-crear',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    stories: () => [],
    routes: ['/story/new?kind=text'],
    actions: {
      '/story/new?kind=text': async (page) => {
        await page
          .getByLabel('Texto de la story')
          .fill('Cuando llegues hay café. Y si no hay, lo hago yo.');
        await page.getByRole('radio', { name: 'Fondo cempasuchil' }).click();
        await page.waitForTimeout(500);
      },
    },
  },
  stories_crear_dibujo: {
    prefix: 'stories-crear',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    stories: () => [],
    routes: ['/story/new?kind=drawing'],
    actions: {
      '/story/new?kind=drawing': async (page) => {
        const canvas = page.getByLabel('Lienzo para dibujar');
        const box = await canvas.boundingBox();
        const drag = async (points) => {
          await page.mouse.move(
            box.x + points[0][0] * box.width,
            box.y + points[0][1] * box.height,
          );
          await page.mouse.down();
          for (const [x, y] of points.slice(1)) {
            await page.mouse.move(box.x + x * box.width, box.y + y * box.height, { steps: 6 });
          }
          await page.mouse.up();
        };
        await drag([
          [0.15, 0.25],
          [0.3, 0.18],
          [0.5, 0.28],
          [0.7, 0.18],
          [0.85, 0.25],
        ]);
        await page.getByRole('radio', { name: 'Color Jamaica' }).click();
        await page.getByText('Plumón', { exact: true }).click();
        await drag([
          [0.5, 0.6],
          [0.3, 0.45],
          [0.2, 0.55],
          [0.5, 0.78],
          [0.8, 0.55],
          [0.7, 0.45],
          [0.5, 0.6],
        ]);
        await page.getByRole('radio', { name: 'Color Cempasúchil' }).click();
        await page.getByText('Marcatextos', { exact: true }).click();
        await drag([
          [0.2, 0.88],
          [0.5, 0.9],
          [0.8, 0.88],
        ]);
        await page.getByRole('button', { name: 'Pegar un sticker' }).click();
        await page.waitForTimeout(700);
        await page.getByRole('button', { name: 'Pegar ⭐' }).click();
        await page.waitForTimeout(800);
      },
    },
  },
  // Visor de la story de tu pareja (primero la no vista más vieja, luego la foto).
  stories_visor_pareja: {
    prefix: 'stories-visor',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    stories: sampleStories,
    routes: [`/story/view?user=${PARTNER_ID}`, `/story/view?story=${sid(2)}`],
    actions: {
      [`/story/view?user=${PARTNER_ID}`]: async (page) => {
        await page.waitForTimeout(600);
      },
    },
  },
  // Visor de una story mía: con visto, reacción y respuestas; y otra que todavía no ven.
  stories_visor_mia: {
    prefix: 'stories-visor-mia',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    stories: sampleStories,
    routes: [`/story/view?story=${sid(3)}`, `/story/view?story=${sid(4)}`],
  },
  stories_respuestas: {
    prefix: 'stories-respuestas',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    stories: sampleStories,
    routes: [`/story/view?story=${sid(3)}`],
    actions: {
      [`/story/view?story=${sid(3)}`]: async (page) => {
        await page.getByRole('button', { name: /Respuestas \(2\)/ }).click();
        await page.waitForTimeout(900);
      },
    },
  },
  stories_arrancar: {
    prefix: 'stories-arrancar',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    stories: sampleStories,
    routes: [`/story/view?story=${sid(3)}`],
    actions: {
      [`/story/view?story=${sid(3)}`]: async (page) => {
        await page.getByRole('button', { name: 'Arrancar esta story' }).click();
        await page.waitForTimeout(900);
      },
    },
  },
  stories_caducada: {
    prefix: 'stories-caducada',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    stories: () => [],
    routes: [`/story/view?story=${sid(99)}`],
  },
  stories_archivo: {
    prefix: 'stories-archivo',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    stories: sampleArchive,
    routes: ['/story/archive'],
  },
  stories_archivo_vacio: {
    prefix: 'stories-archivo-vacio',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    stories: () => [],
    routes: ['/story/archive'],
  },
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
    moods: sampleMoods,
    routes: [
      '/',
      '/questions',
      '/stories',
      '/memories',
      '/moods',
      '/more',
      '/settings/profile',
      '/settings/couple',
    ],
  },

  // Pestaña Preguntas con racha y días por reparar (prefijo `preguntas-`).
  preguntas: {
    prefix: 'preguntas',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    streak: () => streakWith(12, 23, [2, 3]),
    routes: ['/questions', '/category/conocernos', '/history'],
  },
  // Racha en cero, sin historial ni preguntas contestadas (prefijo `preguntas0-`).
  preguntas_cero: {
    prefix: 'preguntas0',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    streak: () => streakWith(0, 0, []),
    history: () => [],
    categoryQuestions: () => [],
    routes: ['/questions', '/category/conocernos', '/history'],
  },
  // Picantes activas para los dos: la categoría sin candado (prefijo `picantes-`).
  preguntas_picantes: {
    prefix: 'picantes',
    me: profiles.me,
    partner: profiles.partner,
    members: [
      { ...member(ME_ID), spicy_opt_in: true },
      { ...member(PARTNER_ID), spicy_opt_in: true },
    ],
    streak: () => streakWith(3, 5, []),
    routes: ['/questions', '/settings/couple'],
  },
  // Ajuste de pareja: solo mi pareja activó las picantes (prefijo `ella-`).
  pareja_pendiente: {
    prefix: 'pendiente',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), { ...member(PARTNER_ID), spicy_opt_in: true }],
    routes: ['/settings/couple'],
  },
  // Inicio con la pregunta del día en cada estado (prefijo `inicio-...`).
  inicio_te_toca: {
    prefix: 'inicio-tetoca',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    moods: sampleMoods,
    daily: () => todayCard('unanswered_partner_done'),
    streak: () => streakWith(12, 23, [2, 3]),
    routes: ['/'],
  },
  inicio_esperando: {
    prefix: 'inicio-esperando',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    moods: sampleMoods,
    daily: () => todayCard('waiting'),
    streak: () => streakWith(1, 1, []),
    routes: ['/'],
  },
  inicio_ambos: {
    prefix: 'inicio-ambos',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    moods: sampleMoods,
    daily: () => todayCard('both', { comment_count: 3 }),
    streak: () => ({ ...streakWith(13, 23, []), today_done: true }),
    routes: ['/'],
  },
  inicio_racha_cero: {
    prefix: 'inicio-cero',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    moods: sampleMoods,
    daily: () => todayCard('unanswered'),
    streak: () => streakWith(0, 0, []),
    routes: ['/'],
  },
  // Ajustes de avisos con preferencias a medias (prefijo `avisos-`). En web el permiso es
  // 'unavailable'; los otros estados del permiso, el TimeField y el aviso previo se revisan en
  // `/catalogo`.
  avisos: {
    prefix: 'avisos',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    prefs: [
      {
        answers: true,
        comments: true,
        moods: false,
        nudges: true,
        reminder_enabled: true,
        reminder_time: '21:00:00',
      },
    ],
    routes: ['/settings/notifications'],
  },
  // Recordatorio apagado: el selector de hora queda deshabilitado (prefijo `avisos-apagado-`).
  avisos_apagado: {
    prefix: 'avisos-apagado',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    prefs: [
      {
        answers: true,
        comments: false,
        moods: false,
        nudges: true,
        reminder_enabled: false,
        reminder_time: '08:45:00',
      },
    ],
    routes: ['/settings/notifications'],
  },
  // Pantalla de pregunta (prefijo `pregunta-...`). `actions` corre tras cargar cada ruta.
  pregunta_open: {
    prefix: 'pregunta-open',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    daily: () => todayCard('unanswered'),
    routes: ['/question'],
    actions: {
      '/question': async (page) => {
        await page.getByLabel('Tu respuesta').fill('Cualquiera de Soda Stereo, sin pensarlo.');
        await page.waitForTimeout(300);
      },
    },
  },
  pregunta_choice: {
    prefix: 'pregunta-choice',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    daily: () => choiceCard(undefined, { text: null, choice: 0 }),
    routes: ['/question'],
    actions: {
      '/question': async (page) => {
        await page.getByRole('radio', { name: 'Playa' }).click();
        await page.waitForTimeout(300);
      },
    },
  },
  pregunta_esperando: {
    prefix: 'pregunta-esperando',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    daily: () => todayCard('waiting'),
    comments: () => [],
    routes: ['/question'],
  },
  pregunta_ambos: {
    prefix: 'pregunta-ambos',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    daily: () => todayCard('both', { comment_count: 3 }),
    comments: sampleComments,
    routes: ['/question'],
  },
  // Opciones con la misma elección.
  pregunta_igual: {
    prefix: 'pregunta-igual',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    daily: () =>
      choiceCard({ text: 'Con un mapa de papel.', choice: 0 }, { text: null, choice: 0 }),
    comments: () => [],
    routes: ['/question'],
  },
  // Menú de reacciones abierto con pulsación larga.
  pregunta_menu: {
    prefix: 'pregunta-menu',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    daily: () => todayCard('both', { comment_count: 3 }),
    comments: sampleComments,
    routes: ['/question'],
    actions: {
      '/question': async (page) => {
        const target = page.getByText('Pide los tacos que te gustan, yo invito.');
        await target.scrollIntoViewIfNeeded();
        const box = await target.boundingBox();
        await page.mouse.move(box.x + 10, box.y + 5);
        await page.mouse.down();
        await page.waitForTimeout(700);
        await page.mouse.up();
        await page.waitForTimeout(900);
      },
    },
  },
  pregunta_sin_preguntas: {
    prefix: 'pregunta-vacia',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    dailyError: { code: 'P0001', message: 'no_questions', details: null, hint: null },
    routes: ['/question'],
  },
  // Contesto y completo el día: celebración (se captura a media animación).
  pregunta_celebracion: {
    prefix: 'pregunta-celebra',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    daily: () => todayCard('unanswered_partner_done'),
    submitted: () => todayCard('both'),
    streak: () => ({ ...streakWith(13, 23, []), today_done: true }),
    comments: () => [],
    routes: ['/question'],
    actions: {
      '/question': async (page) => {
        await page.getByLabel('Tu respuesta').fill('Cualquiera de Soda Stereo, sin pensarlo.');
        await page.getByRole('button', { name: 'Pegar mi respuesta' }).click();
        await page.waitForTimeout(1100);
      },
    },
  },
  // Sin fecha de aniversario y sin moods (prefijo `empty-` en las capturas).
  ready_empty: {
    prefix: 'empty',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    couple: { ...couple, anniversary_date: null },
    routes: ['/', '/moods'],
  },
  // Hoy es el día 1,000: sello de hito (prefijo `hito-`).
  ready_hito: {
    prefix: 'hito',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    couple: { ...couple, anniversary_date: isoDaysAgo(999) },
    moods: sampleMoods,
    routes: ['/'],
  },
  // Selector de mood abierto (prefijo `sheet-`). `actions` corre tras cargar cada ruta.
  ready_sheet: {
    prefix: 'sheet',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    moods: sampleMoods,
    routes: ['/'],
    actions: {
      '/': async (page) => {
        await page.getByRole('button', { name: /Alita/ }).first().click();
        await page.waitForTimeout(900);
      },
    },
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
      return rows(
        route,
        request,
        (scenario.members ?? []).length ? [scenario.couple ?? couple] : [],
      );
    }
    if (path === '/rest/v1/moods') {
      const list = typeof scenario.moods === 'function' ? scenario.moods() : (scenario.moods ?? []);
      return json(route, list);
    }
    if (path === '/rest/v1/rpc/set_mood' && request.method() === 'POST') {
      const body = request.postDataJSON?.() ?? {};
      return json(route, {
        id: '44444444-4444-4444-8444-999999999999',
        couple_id: COUPLE_ID,
        user_id: ME_ID,
        emoji: body.p_emoji ?? '🙂',
        note: body.p_note ?? null,
        created_at: new Date().toISOString(),
      });
    }

    if (path === '/rest/v1/notification_prefs') {
      if (request.method() !== 'GET') return route.fulfill({ status: 204, headers: CORS });
      return rows(route, request, scenario.prefs ?? []);
    }
    if (path === '/rest/v1/rpc/send_test_notification') return json(route, true);

    // Stories (Fase 6)
    if (path === '/rest/v1/stories') {
      if (scenario.storiesError) return json(route, { message: 'boom' }, 500);
      const all = (scenario.stories ?? (() => []))();
      const idFilter = url.searchParams.get('id');
      if (idFilter)
        return rows(
          route,
          request,
          all.filter((r) => idFilter === `eq.${r.id}`),
        );
      if (url.searchParams.get('user_id')) {
        return json(
          route,
          all.filter((r) => r.user_id === ME_ID),
        );
      }
      return json(
        route,
        all.filter((r) => Date.parse(r.expires_at) > Date.now()),
      );
    }
    if (
      path.startsWith('/rest/v1/rpc/') &&
      /\/(mark_story_seen|react_to_story|delete_story|set_story_archive)$/.test(path)
    ) {
      return route.fulfill({ status: 204, headers: CORS });
    }
    if (path === '/rest/v1/rpc/reply_to_story') {
      const body = request.postDataJSON?.() ?? {};
      return json(route, {
        id: '99999999-9999-4999-8999-999999999999',
        story_id: body.p_story_id,
        couple_id: COUPLE_ID,
        user_id: ME_ID,
        body: body.p_body ?? '',
        created_at: new Date().toISOString(),
      });
    }
    if (path === '/rest/v1/rpc/my_couple_id') return json(route, COUPLE_ID);

    if (path === '/rest/v1/question_categories') return json(route, CATEGORIES);
    if (path === '/rest/v1/rpc/get_streak') {
      return json(route, (scenario.streak ?? (() => streakWith(12, 23, [2, 3])))());
    }
    if (path === '/rest/v1/rpc/get_daily_question') {
      if (scenario.dailyError) return json(route, scenario.dailyError, 400);
      return json(route, (scenario.daily ?? dailyCard)());
    }
    if (path === '/rest/v1/rpc/get_question_with_answers') {
      return json(route, (scenario.daily ?? dailyCard)());
    }
    if (path === '/rest/v1/rpc/submit_answer') {
      return json(route, (scenario.submitted ?? scenario.daily ?? dailyCard)());
    }
    if (path === '/rest/v1/answer_comments') {
      return json(route, (scenario.comments ?? (() => []))());
    }
    if (path === '/rest/v1/rpc/add_comment') {
      const body = request.postDataJSON?.() ?? {};
      return json(route, comment(99, ME_ID, body.p_body ?? '', 0));
    }
    if (path === '/rest/v1/rpc/react_to_comment') return json(route, comment(98, ME_ID, '', 0));
    if (path === '/rest/v1/rpc/delete_answer' || path === '/rest/v1/rpc/delete_comment') {
      return route.fulfill({ status: 204, headers: CORS });
    }
    if (path === '/rest/v1/rpc/send_nudge') {
      return json(route, {
        id: '77777777-7777-4777-8777-000000000001',
        couple_id: COUPLE_ID,
        from_user: ME_ID,
        to_user: PARTNER_ID,
        kind: 'answer',
        created_at: new Date().toISOString(),
      });
    }
    if (path === '/rest/v1/rpc/get_history') {
      return json(route, (scenario.history ?? sampleHistory)());
    }
    if (path === '/rest/v1/rpc/get_category_questions') {
      return json(route, (scenario.categoryQuestions ?? sampleCategoryQuestions)());
    }
    if (path === '/rest/v1/rpc/set_spicy_opt_in') return json(route, false);

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

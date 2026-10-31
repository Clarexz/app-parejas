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

// --- Memorias (Fase 7) ------------------------------------------------------------------------

const mid = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, '0')}`;
/** ISO 'YYYY-MM-DD' de hoy (Ciudad de México) hace `n` años. */
const isoYearsAgo = (n) => {
  const [y, m, d] = isoDaysAgo(0).split('-');
  return `${Number(y) - n}-${m}-${d}`;
};

/** Memoria con fotos anidadas (como `select('*, photos:memory_photos(*)')`). */
const memoryRow = (n, title, happenedOn, o = {}) => {
  const sizes = [
    [1200, 1600],
    [1600, 1200],
    [1200, 1200],
  ];
  const count = o.photos ?? 1;
  return {
    id: mid(n),
    couple_id: COUPLE_ID,
    created_by: o.by ?? ME_ID,
    title,
    body: o.body ?? null,
    happened_on: happenedOn,
    lat: o.lat ?? null,
    lng: o.lng ?? null,
    place_name: o.place ?? null,
    created_at: hoursAgo(24 * (30 - n)),
    updated_at: hoursAgo(24 * (30 - n)),
    photos: Array.from({ length: count }, (_, k) => {
      const [width, height] = sizes[(n + k) % sizes.length];
      return {
        id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(n * 100 + k).padStart(12, '0')}`,
        couple_id: COUPLE_ID,
        memory_id: mid(n),
        path: `${COUPLE_ID}/${ME_ID}/m${n}-${k}.jpg`,
        thumb_path: `${COUPLE_ID}/${ME_ID}/m${n}-${k}_thumb.jpg`,
        position: k,
        width,
        height,
        created_at: hoursAgo(24 * (30 - n)),
      };
    }),
  };
};

const sampleMemories = () => [
  memoryRow(1, 'Tacos de pastor a las 2 am', isoDaysAgo(3), {
    place: 'Condesa, CDMX',
    lat: 19.4115,
    lng: -99.173,
    body: 'Salimos de la fiesta con hambre y el señor del trompo ya nos conocía. Le pedimos doble de piña y nos sentamos en la banqueta a platicar de todo.',
  }),
  memoryRow(2, 'Domingo en Coyoacán', isoDaysAgo(20), {
    photos: 3,
    place: 'Coyoacán, CDMX',
    lat: 19.3467,
    lng: -99.1617,
    body: 'Helado de mamey, el mercado y la tarde entera sin reloj.',
  }),
  memoryRow(3, 'Atardecer en Mazunte', '2026-08-14', {
    photos: 5,
    place: 'Playa Mazunte, Oaxaca',
    lat: 15.6669,
    lng: -96.5545,
    body: 'Nos tocó el mejor atardecer del viaje. Caleb dice que fue casualidad; yo digo que lo pedí.',
  }),
  memoryRow(4, 'Nuestro primer viaje en carretera, con todo y llanta ponchada', '2026-08-02', {
    photos: 2,
  }),
  memoryRow(5, 'Cumple de Caleb', '2026-05-20', {
    photos: 4,
    place: 'Casa de los suegros',
    lat: 20.6597,
    lng: -103.3496,
  }),
  memoryRow(6, 'Teotihuacán antes de que saliera el sol', isoYearsAgo(1), {
    photos: 3,
    by: PARTNER_ID,
    place: 'Teotihuacán, Edomex',
    lat: 19.6925,
    lng: -98.8438,
    body: 'Subimos la Pirámide del Sol con frío y sueño. Valió cada escalón.',
  }),
  memoryRow(7, 'Halloween en casa', isoYearsAgo(2), { photos: 1 }),
  memoryRow(8, 'Primer café juntos', '2023-02-14', {
    place: 'Café de la esquina',
    lat: 19.426,
    lng: -99.17,
  }),
];

const memoriesSession = {
  me: profiles.me,
  partner: profiles.partner,
  members: [member(ME_ID), member(PARTNER_ID)],
  memories: sampleMemories,
};

/** Escenarios: qué datos devuelve el "servidor" y qué rutas se capturan. */

// --- Juegos (Fase 9) ---------------------------------------------------------------------------

const gid = (n) => `cccccccc-cccc-4ccc-8ccc-${String(n).padStart(12, '0')}`;
const R_PLAY = gid(1);
const R_WAIT = gid(2);
const R_DONE = gid(3);
const D_DRAW = gid(11);
const D_GUESS = gid(12);
const D_SOLVED = gid(13);

const WYR_ITEMS = [
  ['¿Prefieres viajar en el tiempo al pasado o al futuro?', ['Al pasado', 'Al futuro']],
  ['¿Prefieres desayunar tacos o hot cakes todos los domingos?', ['Tacos', 'Hot cakes']],
  ['¿Prefieres vivir en la playa o en la montaña?', ['En la playa', 'En la montaña']],
  ['¿Prefieres perder tu celular o tus llaves por un mes?', ['El celular', 'Las llaves']],
  ['¿Prefieres una cena elegante o una pizza en la sala?', ['Cena elegante', 'Pizza en la sala']],
  ['¿Prefieres saber siempre la hora o siempre el clima?', ['La hora', 'El clima']],
  ['¿Prefieres bailar en una boda o dar el brindis?', ['Bailar', 'El brindis']],
  ['¿Prefieres que te sorprendan o planear todo?', ['Sorpresa', 'Plan completo']],
  ['¿Prefieres cine en casa o en la sala de cine?', ['En casa', 'En el cine']],
  ['¿Prefieres un viaje largo o muchas escapadas cortas?', ['Un viaje largo', 'Escapadas']],
].map(([text, options], i) => ({
  id: qid(2000 + i),
  position: i,
  text,
  options,
  intensity: 'ligera',
}));

const choices = (n, pattern) =>
  Object.fromEntries(WYR_ITEMS.slice(0, n).map((it, i) => [it.id, pattern[i % pattern.length]]));

const wyrRound = (id, o) => ({
  id,
  game: 'wyr',
  spicy: false,
  status: 'playing',
  created_by: PARTNER_ID,
  created_at: minutesAgo(60 * 5),
  finished_at: null,
  total: 10,
  my_count: 0,
  partner_count: 0,
  items: WYR_ITEMS,
  mine: {},
  partner: null,
  match: null,
  ...o,
});

const gameRounds = () => ({
  [R_PLAY]: wyrRound(R_PLAY, { my_count: 3, partner_count: 7, mine: choices(3, [0, 1, 0]) }),
  [R_WAIT]: wyrRound(R_WAIT, { my_count: 10, partner_count: 4, mine: choices(10, [0, 1, 1, 0]) }),
  [R_DONE]: wyrRound(R_DONE, {
    status: 'finished',
    finished_at: minutesAgo(30),
    my_count: 10,
    partner_count: 10,
    mine: choices(10, [0, 1, 1, 0, 0]),
    partner: choices(10, [0, 1, 0, 0, 1, 1, 0, 1, 1, 0]),
    match: { matches: 7, total: 10, pct: 70 },
  }),
});

const drawingBase = {
  created_at: minutesAgo(90),
  drawn_at: minutesAgo(80),
  finished_at: null,
  word: null,
  strokes: null,
  guesses: [],
  guess_count: 0,
  hint: '_ _ _ _ _ _',
  word_length: 6,
  rerolls_left: 3,
};

const drawings = () => ({
  [D_DRAW]: {
    ...drawingBase,
    id: D_DRAW,
    drawer_id: ME_ID,
    guesser_id: PARTNER_ID,
    status: 'drawing',
    drawn_at: null,
    word: 'Piñata',
    rerolls_left: 2,
  },
  [D_GUESS]: {
    ...drawingBase,
    id: D_GUESS,
    drawer_id: PARTNER_ID,
    guesser_id: ME_ID,
    status: 'guessing',
    strokes: sampleStrokes(),
    guesses: [
      { text: 'sombrero', at: minutesAgo(20) },
      { text: 'una montaña', at: minutesAgo(15) },
      { text: 'estrella', at: minutesAgo(10) },
    ],
    guess_count: 3,
  },
  [D_SOLVED]: {
    ...drawingBase,
    id: D_SOLVED,
    drawer_id: PARTNER_ID,
    guesser_id: ME_ID,
    status: 'solved',
    finished_at: minutesAgo(5),
    strokes: sampleStrokes(),
    word: 'Piñata',
    guesses: [
      { text: 'sombrero', at: minutesAgo(20) },
      { text: 'estrella', at: minutesAgo(10) },
      { text: 'la piñata', at: minutesAgo(6) },
    ],
    guess_count: 3,
  },
});

const drawingSummary = (d) => ({
  id: d.id,
  drawer_id: d.drawer_id,
  guesser_id: d.guesser_id,
  status: d.status,
  created_at: d.created_at,
  drawn_at: d.drawn_at,
  finished_at: d.finished_at,
  guess_count: d.guess_count,
  word: d.word,
});

const gameOverview = (o = {}) => {
  const rounds = gameRounds();
  const open = (r) => ({
    id: r.id,
    spicy: false,
    created_by: r.created_by,
    created_at: r.created_at,
    my_count: r.my_count,
    partner_count: r.partner_count,
    total: r.total,
  });
  const ds = drawings();
  return {
    games: [
      {
        game: 'wyr',
        open_round: open(rounds[R_PLAY]),
        finished_count: 3,
        avg_pct: 64,
        last_pct: 70,
      },
      { game: 'nhie', open_round: null, finished_count: 1, avg_pct: 80, last_pct: 80 },
      { game: 'most_likely', open_round: null, finished_count: 0, avg_pct: null, last_pct: null },
      { game: 'agree', open_round: null, finished_count: 0, avg_pct: null, last_pct: null },
    ],
    recent: [
      { id: R_DONE, game: 'wyr', spicy: false, finished_at: minutesAgo(30), pct: 70 },
      { id: gid(4), game: 'nhie', spicy: false, finished_at: minutesAgo(60 * 30), pct: 80 },
      { id: gid(5), game: 'wyr', spicy: false, finished_at: minutesAgo(60 * 24 * 5), pct: 40 },
    ],
    drawings: { active: [drawingSummary(ds[D_GUESS])], recent: [drawingSummary(ds[D_SOLVED])] },
    ...o,
  };
};

/** Atiende las RPC de juegos del escenario (`overview` decide el resumen del hub). */
const gamesRest =
  (overview = gameOverview) =>
  (path, { route, json }) => {
    if (path === '/rest/v1/rpc/get_game_overview') return json(route, overview());
    if (path === '/rest/v1/rpc/get_game_round') {
      const body = route.request().postDataJSON?.() ?? {};
      const r = gameRounds()[body.p_round_id];
      return r
        ? json(route, r)
        : json(route, { code: 'P0001', message: 'round_not_found', details: '', hint: '' }, 400);
    }
    if (path === '/rest/v1/rpc/get_drawing') {
      const body = route.request().postDataJSON?.() ?? {};
      const d = drawings()[body.p_id];
      return d
        ? json(route, d)
        : json(route, { code: 'P0001', message: 'drawing_not_found', details: '', hint: '' }, 400);
    }
    return undefined;
  };

const gamesBase = {
  me: profiles.me,
  partner: profiles.partner,
  members: [member(ME_ID), member(PARTNER_ID)],
};

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

  // Memorias (Fase 7): diario, mapa de papel, detalle, editar, vacío y error (prefijo `memorias-`).
  memorias_diario: {
    prefix: 'memorias',
    ...memoriesSession,
    routes: ['/memories'],
  },
  memorias_mapa: {
    prefix: 'memorias-mapa',
    ...memoriesSession,
    routes: ['/memories'],
    actions: {
      '/memories': async (page) => {
        await page.getByRole('button', { name: 'Mapa' }).click();
        await page.waitForTimeout(600);
      },
    },
  },
  memorias_vacio: {
    prefix: 'memorias-vacio',
    ...memoriesSession,
    memories: () => [],
    routes: ['/memories'],
  },
  memorias_error: {
    prefix: 'memorias-error',
    ...memoriesSession,
    memoriesError: true,
    routes: ['/memories'],
  },
  memorias_detalle: {
    prefix: 'memorias-detalle',
    ...memoriesSession,
    routes: [`/memory/${mid(3)}`, `/memory/${mid(4)}`],
  },
  memorias_noencontrada: {
    prefix: 'memorias-noencontrada',
    ...memoriesSession,
    routes: [`/memory/${mid(99)}`],
  },
  memorias_arrancar: {
    prefix: 'memorias-arrancar',
    ...memoriesSession,
    routes: [`/memory/${mid(2)}`],
    actions: {
      [`/memory/${mid(2)}`]: async (page) => {
        await page.getByRole('button', { name: 'Arrancar esta hoja' }).click();
        await page.waitForTimeout(900);
      },
    },
  },
  memorias_editar: {
    prefix: 'memorias-editar',
    ...memoriesSession,
    routes: [`/memory/edit?id=${mid(3)}`],
  },
  memorias_nueva: {
    prefix: 'memorias-nueva',
    ...memoriesSession,
    routes: ['/memory/edit'],
    actions: {
      '/memory/edit': async (page) => {
        await page.getByRole('button', { name: 'Pegar memoria' }).click();
        await page.waitForTimeout(500);
      },
    },
  },
  memorias_lugar: {
    prefix: 'memorias-lugar',
    ...memoriesSession,
    routes: ['/memory/edit'],
    actions: {
      '/memory/edit': async (page) => {
        await page.getByRole('button', { name: 'Elegir en el mapa' }).click();
        await page.waitForTimeout(700);
      },
    },
  },
  // Inicio con "Un día como hoy" (hay memorias de este mismo día en años anteriores).
  memorias_inicio: {
    prefix: 'memorias-inicio',
    ...memoriesSession,
    moods: sampleMoods,
    routes: ['/'],
  },
  // --- Fase 8: cuentas regresivas (prefijo `eventos-`) ---
  // Cuentas regresivas: con una visita, fechas propias (una repetida) y una que ya pasó.
  eventos: (() => {
    const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
    const ev = (n, kind, title, emoji, date, yearly = false, note = null) => ({
      id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(n).padStart(12, '0')}`,
      couple_id: COUPLE_ID,
      created_by: ME_ID,
      kind,
      title,
      emoji,
      date,
      recurring_yearly: yearly,
      note,
      created_at: '2026-10-01T12:00:00Z',
      updated_at: '2026-10-01T12:00:00Z',
    });
    const list = [
      ev(1, 'visit', 'Nos vemos en Guadalajara', '✈️', day(23)),
      ev(2, 'custom', 'Concierto de Natalia Lafourcade', '🎶', day(61)),
      ev(3, 'custom', 'Cumple de mamá', '🎂', day(140), true, 'Llevar el pastel'),
      ev(4, 'custom', 'Cine de verano', '🎬', day(-12)),
    ];
    return {
      prefix: 'eventos',
      me: profiles.me,
      partner: profiles.partner,
      members: [member(ME_ID), member(PARTNER_ID)],
      moods: sampleMoods,
      routes: ['/events', '/'],
      rest: (path, { route, json }) => {
        if (path === '/rest/v1/events') return json(route, list);
        if (path === '/rest/v1/rpc/save_event') return json(route, list[0]);
        if (path === '/rest/v1/rpc/delete_event') return json(route, null);
        return undefined;
      },
    };
  })(),
  // Sin eventos: invitación a apuntar la próxima visita.
  eventos_vacio: {
    prefix: 'eventos-vacio',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    moods: sampleMoods,
    routes: ['/events'],
    rest: (path, { route, json }) => {
      if (path === '/rest/v1/events') return json(route, []);
      if (path === '/rest/v1/rpc/save_event') return json(route, {});
      if (path === '/rest/v1/rpc/delete_event') return json(route, null);
      return undefined;
    },
  },
  // Editar una fecha propia (la visita) y crear una nueva.
  eventos_editar: {
    prefix: 'eventos-editar',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    routes: ['/events/edit?id=bbbbbbbb-bbbb-4bbb-8bbb-000000000001', '/events/edit?kind=visit'],
    rest: (path, { route, json }) => {
      if (path === '/rest/v1/events') {
        const date = new Date(Date.now() + 23 * 86_400_000).toISOString().slice(0, 10);
        return json(route, [
          {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001',
            couple_id: COUPLE_ID,
            created_by: ME_ID,
            kind: 'visit',
            title: 'Nos vemos en Guadalajara',
            emoji: '✈️',
            date,
            recurring_yearly: false,
            note: 'Llego el viernes en la noche',
            created_at: '2026-10-01T12:00:00Z',
            updated_at: '2026-10-01T12:00:00Z',
          },
        ]);
      }
      if (path === '/rest/v1/rpc/save_event') return json(route, {});
      if (path === '/rest/v1/rpc/delete_event') return json(route, null);
      return undefined;
    },
  },
  // --- Fase 8: listas (prefijo `listas-`) ---
  ...(() => {
    const lid = (n) => `bbbbbbbb-bbbb-4bbb-8bbb-${String(n).padStart(12, '0')}`;
    const iid = (n) => `cccccccc-cccc-4ccc-8ccc-${String(n).padStart(12, '0')}`;
    const session = {
      me: profiles.me,
      partner: profiles.partner,
      members: [member(ME_ID), member(PARTNER_ID)],
    };
    const listRow = (n, kind, title, emoji, items, daysAgo) => ({
      id: lid(n),
      couple_id: COUPLE_ID,
      created_by: n % 2 ? ME_ID : PARTNER_ID,
      kind,
      title,
      emoji,
      created_at: `${isoDaysAgo(daysAgo)}T15:00:00Z`,
      updated_at: `${isoDaysAgo(daysAgo)}T15:00:00Z`,
      list_items: items.map((it) => ({ id: it.id, done: it.done })),
    });
    const item = (n, listN, position, text, doneBy = null) => ({
      id: iid(n),
      couple_id: COUPLE_ID,
      created_by: ME_ID,
      done_by: doneBy,
      list_id: lid(listN),
      text,
      done: doneBy !== null,
      done_at: doneBy ? minutesAgo(90 + n) : null,
      position,
      created_at: `${isoDaysAgo(3)}T15:00:00Z`,
      updated_at: `${isoDaysAgo(1)}T15:00:00Z`,
    });
    const items = [
      item(1, 1, 0, 'Jitomates y cilantro'),
      item(2, 1, 1, 'Leche de avena'),
      item(3, 1, 2, 'Tortillas de maíz, de las que dejan de tres días'),
      item(4, 1, 3, 'Queso Oaxaca', PARTNER_ID),
      item(5, 1, 4, 'Café para la semana', ME_ID),
      item(6, 1, 5, 'Limones', PARTNER_ID),
      item(7, 2, 0, 'Pasaportes'),
      item(8, 2, 1, 'Bloqueador y gorra', ME_ID),
      item(9, 3, 0, 'Pasear en lancha en Xochimilco'),
      item(10, 3, 1, 'Ver las luciérnagas en Nanacamilpa'),
      item(11, 4, 0, 'Dune: Parte dos', PARTNER_ID),
      item(12, 4, 1, 'Esa serie que siempre dejamos para después'),
    ];
    const lists = () => [
      listRow(
        1,
        'groceries',
        'Súper del sábado',
        '🛒',
        items.filter((i) => i.list_id === lid(1)),
        1,
      ),
      listRow(
        2,
        'trip',
        'Qué llevar a Oaxaca',
        '✈️',
        items.filter((i) => i.list_id === lid(2)),
        2,
      ),
      listRow(
        3,
        'bucket',
        'Cosas por hacer juntos',
        null,
        items.filter((i) => i.list_id === lid(3)),
        9,
      ),
      listRow(
        4,
        'watch',
        'Pelis y series',
        null,
        items.filter((i) => i.list_id === lid(4)),
        20,
      ),
    ];
    const restFor =
      (getLists, getItems) =>
      (path, { url, request, route, json, rows }) => {
        if (path === '/rest/v1/lists') {
          const idFilter = url.searchParams.get('id');
          if (idFilter) {
            return rows(
              route,
              request,
              getLists().filter((l) => idFilter === `eq.${l.id}`),
            );
          }
          return json(route, getLists());
        }
        if (path === '/rest/v1/list_items') {
          const listFilter = url.searchParams.get('list_id') ?? '';
          const mine = getItems().filter((i) => listFilter === `eq.${i.list_id}`);
          return json(
            route,
            [...mine].sort((a, b) => a.position - b.position),
          );
        }
        if (path.startsWith('/rest/v1/rpc/') && /list/.test(path)) {
          return route.fulfill({ status: 204, headers: CORS });
        }
        return undefined;
      };
    const full = restFor(lists, () => items);
    return {
      listas: {
        prefix: 'listas',
        ...session,
        rest: full,
        routes: ['/lists', `/lists/${lid(1)}`, `/lists/${lid(3)}`],
      },
      listas_acomodar: {
        prefix: 'listas-acomodar',
        ...session,
        rest: full,
        routes: [`/lists/${lid(1)}`],
        actions: {
          [`/lists/${lid(1)}`]: async (page) => {
            await page.getByRole('button', { name: 'Acomodar los renglones' }).click();
            await page.waitForTimeout(500);
          },
        },
      },
      listas_nueva: {
        prefix: 'listas-nueva',
        ...session,
        rest: full,
        routes: ['/lists'],
        actions: {
          '/lists': async (page) => {
            await page.getByRole('button', { name: 'Nueva lista' }).click();
            await page.waitForTimeout(700);
          },
        },
      },
      listas_vacio: {
        prefix: 'listas-vacio',
        ...session,
        rest: restFor(
          () => [],
          () => [],
        ),
        routes: ['/lists'],
      },
    };
  })(),
  // --- Fase 8: distancia (prefijo `distancia-`) ---
  // Los dos comparten: kilómetros en grande, ciudades y "hace cuánto" (Inicio y /distance).
  distancia: {
    prefix: 'distancia',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    moods: sampleMoods,
    routes: ['/distance', '/'],
    rest: (path, { route, json }) => {
      if (path === '/rest/v1/locations') {
        return json(route, [
          {
            user_id: ME_ID,
            couple_id: COUPLE_ID,
            lat: 19.43,
            lng: -99.13,
            city: 'Ciudad de México',
            updated_at: new Date(Date.now() - 5 * 60_000).toISOString(),
          },
          {
            user_id: PARTNER_ID,
            couple_id: COUPLE_ID,
            lat: 25.67,
            lng: -100.31,
            city: 'Monterrey',
            updated_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
          },
        ]);
      }
      if (path === '/rest/v1/rpc/set_my_location') return json(route, {});
      if (path === '/rest/v1/rpc/clear_my_location') return json(route, null);
      return undefined;
    },
  },
  // Solo yo comparto: espera a que mi pareja active la suya.
  distancia_solo_yo: {
    prefix: 'distancia-solo-yo',
    me: profiles.me,
    partner: profiles.partner,
    members: [member(ME_ID), member(PARTNER_ID)],
    moods: sampleMoods,
    routes: ['/distance', '/'],
    rest: (path, { route, json }) => {
      if (path === '/rest/v1/locations') {
        return json(route, [
          {
            user_id: ME_ID,
            couple_id: COUPLE_ID,
            lat: 19.43,
            lng: -99.13,
            city: 'Ciudad de México',
            updated_at: new Date(Date.now() - 5 * 60_000).toISOString(),
          },
        ]);
      }
      if (path === '/rest/v1/rpc/set_my_location') return json(route, {});
      if (path === '/rest/v1/rpc/clear_my_location') return json(route, null);
      return undefined;
    },
  },

  // Juegos (Fase 9): hub con turno pendiente, versión picante activa y vacío.
  juegos_hub: {
    prefix: 'juegos-hub',
    ...gamesBase,
    rest: gamesRest(),
    routes: ['/games'],
  },
  juegos_hoja: {
    prefix: 'juegos-hoja',
    ...gamesBase,
    members: [
      { ...member(ME_ID), spicy_opt_in: true },
      { ...member(PARTNER_ID), spicy_opt_in: true },
    ],
    rest: gamesRest(),
    routes: ['/games'],
    actions: {
      '/games': async (page) => {
        await page.getByRole('button', { name: /^De acuerdo o no\./ }).click();
        await page.waitForTimeout(700);
      },
    },
  },
  juegos_hoja_sin_picantes: {
    prefix: 'juegos-hoja-sin-picantes',
    ...gamesBase,
    rest: gamesRest(),
    routes: ['/games'],
    actions: {
      '/games': async (page) => {
        await page.getByRole('button', { name: /^De acuerdo o no\./ }).click();
        await page.waitForTimeout(700);
      },
    },
  },
  juegos_vacio: {
    prefix: 'juegos-vacio',
    ...gamesBase,
    rest: gamesRest(() => ({
      games: ['wyr', 'nhie', 'most_likely', 'agree'].map((game) => ({
        game,
        open_round: null,
        finished_count: 0,
        avg_pct: null,
        last_pct: null,
      })),
      recent: [],
      drawings: { active: [], recent: [] },
    })),
    routes: ['/games'],
  },
  juegos_error: {
    prefix: 'juegos-error',
    ...gamesBase,
    rest: (path, { route, json }) =>
      path === '/rest/v1/rpc/get_game_overview' ? json(route, { message: 'boom' }, 500) : undefined,
    routes: ['/games'],
  },
  juegos_ronda: {
    prefix: 'juegos-ronda',
    ...gamesBase,
    rest: gamesRest(),
    routes: [`/game/${R_PLAY}`],
  },
  juegos_espera: {
    prefix: 'juegos-espera',
    ...gamesBase,
    rest: gamesRest(),
    routes: [`/game/${R_WAIT}`],
  },
  juegos_resultados: {
    prefix: 'juegos-resultados',
    ...gamesBase,
    rest: gamesRest(),
    routes: [`/game/${R_DONE}`],
  },
  juegos_no_existe: {
    prefix: 'juegos-no-existe',
    ...gamesBase,
    rest: gamesRest(),
    routes: [`/game/${gid(99)}`],
  },
  juegos_dibujando: {
    prefix: 'juegos-dibujando',
    ...gamesBase,
    rest: gamesRest(),
    routes: [`/drawing/${D_DRAW}`],
  },
  juegos_adivinando: {
    prefix: 'juegos-adivinando',
    ...gamesBase,
    rest: gamesRest(),
    routes: [`/drawing/${D_GUESS}`],
  },
  juegos_resuelto: {
    prefix: 'juegos-resuelto',
    ...gamesBase,
    rest: gamesRest(),
    routes: [`/drawing/${D_SOLVED}`],
  },
  // Pestaña Preguntas con la ficha de Juegos (turno pendiente en el resumen).
  juegos_preguntas: {
    prefix: 'juegos-preguntas',
    ...gamesBase,
    streak: () => streakWith(12, 23, [2]),
    rest: gamesRest(),
    routes: ['/questions'],
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
const PHOTO_PALETTES = [
  ['#BFE0E8', '#F2B25A', '#6FA070', '#4F7A4A'],
  ['#F2D3C4', '#C23B6B', '#8E9AC4', '#5F6690'],
  ['#E9E2B8', '#E8932A', '#7FA58B', '#3F6B58'],
  ['#CFD8EE', '#F7F4EC', '#A98BB7', '#6F5A86'],
];
/** Paisaje de ejemplo: la paleta depende de la ruta para que las fotos no se vean idénticas. */
const photoSvg = (seed = '') => {
  const sum = [...seed].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const [sky, sun, far, near] = PHOTO_PALETTES[sum % PHOTO_PALETTES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
<rect width="400" height="400" fill="${sky}"/><circle cx="290" cy="110" r="46" fill="${sun}"/>
<path d="M0 400V270q90-110 190-30t210-50v210z" fill="${far}"/><path d="M0 400V330q120-70 230-10t170-20v100z" fill="${near}"/></svg>`;
};

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

    // Fase 8+: un escenario puede atender sus propias rutas (tablas o RPC nuevas) con
    // `rest(path, { url, request, route, json, rows })`; si devuelve algo, ya respondió.
    if (scenario.rest) {
      // Se revisa sin esperar: `json()` es una promesa que resuelve en undefined.
      const handled = scenario.rest(path, { url, request, route, json, rows });
      if (handled !== undefined) return handled;
    }

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
    // Memorias (Fase 7)
    if (path === '/rest/v1/memories') {
      if (scenario.memoriesError) return json(route, { message: 'boom' }, 500);
      const all = (scenario.memories ?? (() => []))();
      const idFilter = url.searchParams.get('id');
      if (idFilter) {
        return rows(
          route,
          request,
          all.filter((r) => idFilter === `eq.${r.id}`),
        );
      }
      return json(route, all);
    }
    if (path === '/rest/v1/rpc/delete_memory') return route.fulfill({ status: 204, headers: CORS });

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

    // Storage: URLs firmadas en lote (`createSignedUrls`) de un bucket.
    if (request.method() === 'POST' && /^\/storage\/v1\/object\/sign\/[^/]+$/.test(path)) {
      const bucket = path.split('/').pop();
      const body = request.postDataJSON?.() ?? {};
      return json(
        route,
        (body.paths ?? []).map((p) => ({
          error: null,
          path: p,
          signedURL: `/object/sign/${bucket}/${p}?token=shots`,
        })),
      );
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
        body: photoSvg(path),
      });
    }

    // Una tabla que el escenario no simula responde vacía (PostgREST siempre devuelve una lista).
    if (request.method() === 'GET' && /^\/rest\/v1\/[a-z_]+$/.test(path))
      return rows(route, request, []);
    return json(route, {});
  });

  // Realtime no se necesita: se cierra el websocket para que no reintente.
  await context.routeWebSocket(/shots\.supabase\.test/, (ws) => ws.close());
}

// Textos de las notificaciones push (español de México, voz de docs/DISENO.md §6).
// TypeScript puro, sin imports ni APIs de Deno/Node: lo usan la Edge Function y los tests de Jest.

export type Copy = { title: string; body: string };
export type CopyBase = { actor: string; recipient: string; seed: number };

// Límites que Android muestra sin cortar de forma fea.
export const COPY_LIMITS = { title: 40, body: 120 };

// Colapsa espacios y saltos de línea; recorta por palabra si se puede y agrega "…". Nunca supera max.
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (max <= 0) return '';
  if (clean.length <= max) return clean;
  if (max === 1) return '…';
  let cut = clean.slice(0, max - 1);
  // No partir un emoji (par sustituto) por la mitad.
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  // Si cabe cortar en un espacio sin perder más de la mitad, se corta por palabra.
  const space = cut.lastIndexOf(' ');
  if (space >= Math.floor(cut.length / 2) && clean[cut.length] !== undefined) {
    cut = cut.slice(0, space);
  }
  cut = cut.replace(/[\s,;:.\-–—]+$/u, '');
  return cut + '…';
}

function pick<T>(variants: T[], seed: number): T {
  const n = Number.isFinite(seed) ? Math.floor(Math.abs(seed)) : 0;
  return variants[n % variants.length];
}

// Nombre corto para el título.
function short(name: string, max = 16): string {
  return truncate(name, max) || 'Tu pareja';
}

// Pregunta entre comillas latinas, recortada; cadena vacía si no hay.
function quoted(question: string | null, max = 60): string {
  const q = question ? truncate(question, max) : '';
  return q ? `«${q}»` : '';
}

function finish(title: string, body: string): Copy {
  return {
    title: truncate(title, COPY_LIMITS.title),
    body: truncate(body, COPY_LIMITS.body),
  };
}

// Las notificaciones llevan el nombre de quien escribe como título y una frase corta como cuerpo.

export function answerCopy(
  i: CopyBase & { daily: boolean; recipientAnswered: boolean; questionText: string | null },
): Copy {
  const a = short(i.actor);
  const q = quoted(i.questionText);
  const extra = i.daily ? '' : ' la pregunta extra';
  const tail = q ? ` ${q}` : '';
  if (i.recipientAnswered) {
    return pick(
      [
        finish(a, `Ya contestó${extra || ' la de hoy'}. Ya pueden leerse.${tail}`),
        finish(a, `Contestó${extra || ' la pregunta'}. A ver qué pusieron los dos.${tail}`),
        finish(a, `Ya están las dos respuestas. Entra a leerlas.${tail}`),
      ],
      i.seed,
    );
  }
  return pick(
    [
      finish(a, `Ya contestó${extra || ' la pregunta de hoy'}. Ahora te toca a ti.${tail}`),
      finish(a, `Ya dejó su respuesta. Contesta tú para leerla.${tail}`),
      finish(a, `Ya contestó. Su respuesta se abre cuando contestes.${tail}`),
    ],
    i.seed,
  );
}

export function commentCopy(
  i: CopyBase & { body: string | null; questionText: string | null },
): Copy {
  const a = short(i.actor);
  if (i.body === null) {
    // No se revela nada del comentario hasta que quien recibe conteste.
    return pick(
      [
        finish(a, 'Te dejó un comentario. Contesta la pregunta para leerlo.'),
        finish(a, 'Comentó algo. Contesta primero y lo lees.'),
        finish(a, 'Hay un comentario esperándote. Se abre cuando contestes.'),
      ],
      i.seed,
    );
  }
  return finish(a, truncate(i.body, 90));
}

export function moodCopy(i: CopyBase & { emoji: string; note: string | null }): Copy {
  const a = short(i.actor, 14);
  const note = i.note ? truncate(i.note, 80) : '';
  if (note) return finish(a, `${i.emoji} ${note}`);
  return pick(
    [
      finish(a, `${i.emoji} Cambió su mood. Entra a ver cómo está.`),
      finish(a, `${i.emoji} Hoy anda así. Pásate a ver.`),
      finish(a, `${i.emoji} Actualizó su mood. Mándale algo bonito.`),
    ],
    i.seed,
  );
}

export function nudgeCopy(i: CopyBase): Copy {
  const a = short(i.actor);
  return pick(
    [
      finish(a, 'Quiere saber qué contestaste hoy. Falta tu respuesta.'),
      finish(a, 'La pregunta de hoy te está esperando.'),
      finish(a, 'Ya quiere leer lo que piensas. Contesta cuando puedas.'),
      finish(a, 'Te toca contestar la pregunta de hoy.'),
    ],
    i.seed,
  );
}

export function storyCopy(
  i: CopyBase & { storyKind: 'photo' | 'text' | 'drawing'; text: string | null },
): Copy {
  const a = short(i.actor);
  if (i.storyKind === 'text') {
    const text = i.text ? truncate(i.text, 100) : '';
    if (text) return finish(a, text);
    return pick(
      [finish(a, 'Subió una story.'), finish(a, 'Escribió una story. Dura 24 horas.')],
      i.seed,
    );
  }
  if (i.storyKind === 'drawing') {
    return pick(
      [
        finish(a, 'Subió un dibujo a su story. Dura 24 horas.'),
        finish(a, 'Hizo un dibujo para ti. Pásate a verlo.'),
        finish(a, 'Dibujó una story. Se borra en 24 horas.'),
      ],
      i.seed,
    );
  }
  return pick(
    [
      finish(a, 'Subió una story. Dura 24 horas.'),
      finish(a, 'Nueva foto en su story. Échale un ojo.'),
      finish(a, 'Subió una foto. Pásate a verla antes de que se borre.'),
    ],
    i.seed,
  );
}

export function storyReplyCopy(i: CopyBase & { body: string; toAuthor: boolean }): Copy {
  const a = short(i.actor);
  const text = truncate(i.body, 100);
  if (text) return finish(a, i.toAuthor ? `Respondió tu story: ${text}` : text);
  return finish(a, i.toAuthor ? 'Respondió tu story.' : 'Te escribió en su story.');
}

export function memoryCopy(i: CopyBase & { title: string | null; placeName: string | null }): Copy {
  const a = short(i.actor);
  const title = i.title ? truncate(i.title, 80) : '';
  const place = i.placeName ? truncate(i.placeName, 30) : '';
  const detail = title && place ? `${title} · ${place}` : title;
  return pick(
    [
      finish(a, detail ? `Guardó una memoria: ${detail}` : 'Guardó una memoria nueva.'),
      finish(a, detail ? `Nueva memoria: ${detail}` : 'Guardó una memoria. Pásate a verla.'),
      finish(a, detail ? `Agregó ${detail} a sus memorias.` : 'Agregó una memoria nueva.'),
    ],
    i.seed,
  );
}

const GAME_NAMES: Record<string, string> = {
  wyr: '¿Qué prefieres?',
  nhie: 'Yo nunca',
  most_likely: '¿Quién es más probable?',
  agree: 'De acuerdo o no',
};

export function gameCopy(
  i: CopyBase & { game: string; event: 'started' | 'finished'; matchPct: number | null },
): Copy {
  const a = short(i.actor);
  const name = GAME_NAMES[i.game] ?? 'un juego';
  if (i.event === 'finished') {
    const pct = i.matchPct === null ? '' : `${Math.round(i.matchPct)} % de coincidencia. `;
    return pick(
      [
        finish(a, `Ya terminaron «${name}». ${pct}Entra a ver en qué coincidieron.`),
        finish(a, `${pct}Vean quién pensó igual que quién.`),
        finish(a, `Resultados de «${name}». ${pct}¿Se conocen tanto como creen?`),
      ],
      i.seed,
    );
  }
  return pick(
    [
      finish(a, `Te retó a «${name}». ¿Le entras?`),
      finish(a, `Empezó una ronda de «${name}». Te toca contestar.`),
      finish(a, `Quiere jugar «${name}» contigo.`),
    ],
    i.seed,
  );
}

export function drawingCopy(
  i: CopyBase & { event: 'ready' | 'solved' | 'gave_up'; word: string | null },
): Copy {
  const a = short(i.actor);
  const word = i.word ? truncate(i.word, 40) : '';
  if (i.event === 'solved') {
    return pick(
      [
        finish(a, word ? `Adivinó tu dibujo: «${word}». Sí te entiende.` : 'Adivinó tu dibujo.'),
        finish(a, word ? `Le atinó a «${word}». Qué buen dibujo.` : 'Le atinó a tu dibujo.'),
        finish(a, word ? `Era «${word}» y ya lo sacó.` : 'Ya sacó tu dibujo.'),
      ],
      i.seed,
    );
  }
  if (i.event === 'gave_up') {
    return pick(
      [
        finish(a, word ? `Se rindió. Era «${word}».` : 'Se rindió con tu dibujo.'),
        finish(
          a,
          word ? `No lo sacó. Era «${word}». Va la revancha.` : 'No lo sacó. Va la revancha.',
        ),
        finish(a, word ? `Se les complicó «${word}». Otra ronda.` : 'Se les complicó. Otra ronda.'),
      ],
      i.seed,
    );
  }
  return pick(
    [
      finish(a, 'Te dejó un dibujo. A ver si adivinas qué es.'),
      finish(a, 'Hizo un dibujo para ti. Te toca adivinar.'),
      finish(a, 'Dibujó algo. ¿Qué será?'),
    ],
    i.seed,
  );
}

export function testCopy(i: CopyBase): Copy {
  const r = short(i.recipient, 20);
  return pick(
    [
      finish('ahorita', `${r}, si ves esto, los avisos sí llegan a este celular.`),
      finish('ahorita', 'Los avisos están llegando bien a este celular.'),
      finish('ahorita', 'Prueba lista: las notificaciones funcionan en este celular.'),
    ],
    i.seed,
  );
}

export function loveLanguageCopy(i: CopyBase & { recipientDone: boolean }): Copy {
  const a = short(i.actor);
  if (i.recipientDone) {
    return pick(
      [
        finish(a, 'Ya terminó el test. Ya pueden comparar sus lenguajes del amor.'),
        finish(a, 'Ya están los dos resultados. Entra a ver qué habla cada quien.'),
        finish(a, 'Terminó su test de lenguajes del amor. Comparen cuando quieran.'),
      ],
      i.seed,
    );
  }
  return pick(
    [
      finish(a, 'Hizo el test de lenguajes del amor. Haz el tuyo y comparan.'),
      finish(a, 'Ya terminó su test. Te toca el tuyo.'),
      finish(a, 'Ya hizo el test de lenguajes. ¿Haces el tuyo?'),
    ],
    i.seed,
  );
}

const MONTHS_LONG = [
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
const MONTHS_SHORT = [
  'ene.',
  'feb.',
  'mar.',
  'abr.',
  'may.',
  'jun.',
  'jul.',
  'ago.',
  'sep.',
  'oct.',
  'nov.',
  'dic.',
];

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

// Rango de fechas en español corto, sin Intl: "el 12 de octubre", "del 12 al 18 de octubre",
// "del 28 de sep. al 2 de oct.", "del 28 de dic. de 2025 al 2 de ene. de 2026".
// Cadena vacía si alguna fecha no es válida (YYYY-MM-DD).
export function formatDateRange(start: string, end: string): string {
  const s = parseYmd(start);
  const e = parseYmd(end);
  if (!s || !e) return '';
  if (s.y === e.y && s.m === e.m) {
    if (s.d === e.d) return `el ${s.d} de ${MONTHS_LONG[s.m - 1]}`;
    return `del ${s.d} al ${e.d} de ${MONTHS_LONG[s.m - 1]}`;
  }
  if (s.y === e.y) {
    return `del ${s.d} de ${MONTHS_SHORT[s.m - 1]} al ${e.d} de ${MONTHS_SHORT[e.m - 1]}`;
  }
  return `del ${s.d} de ${MONTHS_SHORT[s.m - 1]} de ${s.y} al ${e.d} de ${MONTHS_SHORT[e.m - 1]} de ${e.y}`;
}

export function visitCopy(
  i: CopyBase & { startDate: string; endDate: string; place: string | null },
): Copy {
  const a = short(i.actor);
  const range = formatDateRange(i.startDate, i.endDate);
  const place = i.place ? truncate(i.place, 30) : '';
  const where = place ? ` en ${place}` : '';
  const when = range ? `${range}${where}` : place ? `en ${place}` : '';
  const sentence = (lead: string) => (when ? `${lead} ${when}.` : `${lead}.`);
  return pick(
    [
      finish(a, sentence('Apuntó que se vieron')),
      finish(a, when ? `Guardó su visita ${when}.` : 'Guardó una visita. Pásate a verla.'),
      finish(a, sentence('Nueva visita: se vieron')),
    ],
    i.seed,
  );
}

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

export function answerCopy(
  i: CopyBase & { daily: boolean; recipientAnswered: boolean; questionText: string | null },
): Copy {
  const a = short(i.actor);
  const q = quoted(i.questionText);
  const extra = i.daily ? '' : ' (pregunta extra)';
  if (i.recipientAnswered) {
    return pick(
      [
        finish(`${a} ya contestó${extra}`, `Ya pueden ver las dos respuestas. ${q}`),
        finish(`${a} ya pegó su respuesta`, `Ahora sí, a leerse las dos. ${q}`),
        finish(`Ya hay dos respuestas${extra}`, `${a} también contestó. ${q}`),
      ],
      i.seed,
    );
  }
  return pick(
    [
      finish(
        `${a} ya contestó${extra}`,
        `Su respuesta está doblada. Contesta tú para ver qué escribió. ${q}`,
      ),
      finish(`${a} ya la dobló${extra}`, `Te toca. Contesta para desdoblar su respuesta. ${q}`),
      finish(`${a} dejó su respuesta${extra}`, `Está doblada hasta que contestes tú. ${q}`),
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
        finish(`${a} te dejó un comentario`, 'Contesta la pregunta para poder leerlo.'),
        finish(`${a} comentó algo`, 'Contesta primero y lo lees.'),
        finish(`Hay un comentario de ${a}`, 'Se desdobla cuando contestes la pregunta.'),
      ],
      i.seed,
    );
  }
  const text = truncate(i.body, 90);
  return pick(
    [
      finish(`${a} comentó`, text),
      finish(`${a} te escribió`, text),
      finish(`Comentario de ${a}`, text),
    ],
    i.seed,
  );
}

export function moodCopy(i: CopyBase & { emoji: string; note: string | null }): Copy {
  const a = short(i.actor, 14);
  const note = i.note ? truncate(i.note, 80) : '';
  if (note) {
    return pick(
      [
        finish(`${i.emoji} ${a} anda así hoy`, note),
        finish(`${a} pegó su mood ${i.emoji}`, note),
        finish(`${i.emoji} Mood de ${a}`, note),
      ],
      i.seed,
    );
  }
  return pick(
    [
      finish(`${i.emoji} ${a} anda así hoy`, 'Pásate a ver cómo amaneció.'),
      finish(`${a} pegó su mood ${i.emoji}`, 'Un mensajito, un abrazo o lo que toque.'),
      finish(`${i.emoji} Mood de ${a}`, 'Échale un ojo cuando puedas.'),
    ],
    i.seed,
  );
}

export function nudgeCopy(i: CopyBase): Copy {
  const a = short(i.actor);
  return pick(
    [
      finish(
        `${a} te está esperando`,
        'Falta tu respuesta a la pregunta de hoy. Ándale, que no se enfríe.',
      ),
      finish(`${a} te dejó un recordatorio`, 'La pregunta de hoy sigue sin tu respuesta.'),
      finish(`Te toca contestar`, `${a} ya quiere leer lo que piensas de la pregunta de hoy.`),
      finish(`${a} tocó tu puerta`, 'Hay una pregunta de hoy esperando tu respuesta.'),
    ],
    i.seed,
  );
}

export function testCopy(i: CopyBase): Copy {
  const r = short(i.recipient, 20);
  return pick(
    [
      finish('Prueba de avisos', `${r}, si lees esto, los avisos sí llegan a este celular.`),
      finish('Todo en orden', 'Los avisos están llegando bien a este celular.'),
      finish(
        'Aviso de prueba',
        'Te lo mandaste tú mismo: las notificaciones funcionan en este celular.',
      ),
    ],
    i.seed,
  );
}

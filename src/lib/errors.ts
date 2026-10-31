/** Mensajes de error en español de México (docs/DISENO.md §6): qué pasó y qué hacer, sin culpas. */

const NETWORK_MESSAGE = 'No hay señal con el servidor. Revisa tu internet y vuelve a intentar.';
const GENERIC_MESSAGE = 'Algo no salió como esperábamos. Vuelve a intentar en un momento.';

const BY_CODE: Record<string, string> = {
  // Auth de supabase-js
  invalid_credentials: 'El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.',
  user_already_exists: 'Ya hay una cuenta con ese correo. Prueba iniciando sesión.',
  email_exists: 'Ya hay una cuenta con ese correo. Prueba iniciando sesión.',
  weak_password: 'Esa contraseña es muy fácil de adivinar. Usa al menos 8 caracteres.',
  email_address_invalid: 'Ese correo no parece válido. Revisa que esté bien escrito.',
  validation_failed: 'Ese correo no parece válido. Revisa que esté bien escrito.',
  over_request_rate_limit: 'Demasiados intentos seguidos. Espera un minuto y vuelve a intentar.',
  over_email_send_rate_limit: 'Demasiados intentos seguidos. Espera un minuto y vuelve a intentar.',
  signup_disabled: 'Por ahora no se pueden crear cuentas nuevas.',
  // RPC de pareja
  not_authenticated: 'Tu sesión se cerró. Inicia sesión de nuevo.',
  already_in_couple: 'Ya están en una pareja. Para cambiar, primero hay que salir de la actual.',
  invalid_code: 'Ese código no tiene el formato correcto. Son 6 letras y números.',
  code_not_found: 'No encontramos ese código. Revisa que esté bien escrito.',
  couple_full: 'Ese código ya tiene a sus dos personas. Pídele a tu pareja que revise el código.',
  invalid_timezone: 'No reconocimos la zona horaria. Elige otra e intenta de nuevo.',
  // RPC de mood
  no_couple: 'Todavía no están vinculados. Termina de unirte a tu pareja.',
  invalid_mood: 'Ese mood no se pudo guardar. Elige un emoji y una nota corta.',
  // RPC de preguntas
  invalid_day: 'Ese día ya no se puede abrir. Solo se pueden recuperar los últimos 7 días.',
  no_questions: 'Por ahora no hay preguntas disponibles. Vuelve a intentar más tarde.',
  question_not_found: 'No encontramos esa pregunta. Regresa y elige otra.',
  invalid_answer: 'Esa respuesta no se pudo guardar. Revisa que no esté vacía ni sea muy larga.',
  not_answered: 'Para comentar primero contesta la pregunta.',
  invalid_comment: 'Ese comentario no se pudo enviar. Escribe algo corto e intenta de nuevo.',
  comment_not_found: 'Ese comentario ya no existe. Actualiza para ver lo más reciente.',
  invalid_reaction: 'Esa reacción no se pudo guardar. Elige otro emoji.',
  nudge_too_soon: 'Ya le recordaste hace un ratito. Dale un poco de tiempo antes de insistir.',
  no_partner: 'Todavía no hay pareja con quién hacer esto. Cuando se una, podrán hacerlo juntos.',
  invalid_nudge: 'Ese recordatorio no se pudo enviar. Vuelve a intentar.',
  // RPC de stories
  invalid_story: 'Esa story no se pudo publicar. Revisa que tenga contenido y no sea muy larga.',
  too_many_stories: 'Ya tienes muchas stories activas. Espera a que caduquen o arranca alguna.',
  invalid_memory:
    'Esa memoria no se pudo guardar. Revisa el título, la fecha y que no sea muy larga.',
  invalid_photos:
    'Algo pasó con las fotos. Debe haber entre 1 y 10; vuelve a elegirlas e intenta de nuevo.',
  memory_not_found: 'Esa memoria ya no está. Quizá la arrancaron desde el otro celular.',
  story_not_found: 'Esa story ya no está. Pudo caducar o haberla quitado su autor.',
  invalid_reply: 'Esa respuesta no se pudo enviar. Escribe algo corto e intenta de nuevo.',
  // RPC de cuentas regresivas, listas y distancia (Fase 8)
  invalid_event: 'Esa fecha no se pudo guardar. Revisa el nombre y la fecha e intenta de nuevo.',
  event_not_found: 'Esa fecha ya no está. Quizá la borraron desde el otro celular.',
  invalid_list: 'Esa lista no se pudo guardar. Ponle un nombre corto e intenta de nuevo.',
  list_not_found: 'Esa lista ya no está. Quizá la borraron desde el otro celular.',
  invalid_item: 'Ese renglón no se pudo guardar. Escribe algo corto e intenta de nuevo.',
  item_not_found: 'Ese renglón ya no está. Actualiza para ver lo más reciente.',
  invalid_order: 'La lista cambió mientras la acomodabas. Ya la actualizamos; vuelve a intentar.',
  invalid_location: 'No pudimos guardar tu ubicación. Vuelve a intentar en un momento.',
  // RPC de juegos (Fase 9)
  invalid_game: 'Ese juego no existe. Elige otro de la lista.',
  spicy_not_active: 'Las preguntas picantes aún no están activas para ustedes dos.',
  round_not_found: 'Esa ronda ya no está. Quizá la quitaron desde el otro celular.',
  round_finished: 'Esa ronda ya terminó. Entra a ver cómo les fue.',
  invalid_choice: 'Esa respuesta no se pudo guardar. Elige una de las dos opciones.',
  item_not_in_round: 'Esa pregunta ya no es parte de la ronda. Actualiza e intenta de nuevo.',
  drawing_not_found: 'Ese dibujo ya no está. Quizá lo quitaron desde el otro celular.',
  not_drawer: 'Solo quien dibuja puede hacer eso.',
  not_guesser: 'Solo quien adivina puede hacer eso.',
  invalid_drawing_state: 'El reto cambió mientras tanto. Ya lo actualizamos; vuelve a intentar.',
  invalid_drawing: 'Ese dibujo no se pudo enviar. Revisa que tenga trazos y vuelve a intentar.',
  invalid_guess: 'Ese intento no se pudo enviar. Escribe una palabra corta e intenta de nuevo.',
  no_rerolls: 'Ya cambiaste la palabra las 3 veces que se puede. ¡A dibujar esta!',
  no_words: 'Por ahora no hay palabras disponibles. Vuelve a intentar más tarde.',
  // RPC de notificaciones
  invalid_token: 'No pudimos registrar este celular para los avisos. Vuelve a intentar.',
};

function isNetworkError(name: string, message: string, status?: unknown): boolean {
  if (name === 'AuthRetryableFetchError') return true;
  if (status === 0) return true;
  return /network request failed|failed to fetch|network error|load failed/i.test(message);
}

/** Convierte cualquier error (Auth, PostgREST, red, desconocido) en un mensaje para la persona. */
export function errorMessage(error: unknown): string {
  if (error == null) return GENERIC_MESSAGE;
  const e = (typeof error === 'object' ? error : { message: String(error) }) as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
    status?: unknown;
  };
  const name = typeof e.name === 'string' ? e.name : '';
  const message = typeof e.message === 'string' ? e.message : '';
  const code = typeof e.code === 'string' ? e.code : '';

  if (isNetworkError(name, message, e.status)) return NETWORK_MESSAGE;
  if (code && BY_CODE[code]) return BY_CODE[code];
  if (message && BY_CODE[message]) return BY_CODE[message];
  if (code === '23514')
    return 'Alguno de los datos no cumple con lo permitido. Revísalos e intenta de nuevo.';
  if (code === '42501') return 'No tienes permiso para hacer eso.';
  return GENERIC_MESSAGE;
}

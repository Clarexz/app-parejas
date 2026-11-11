/** Mensajes de error en español de México (docs/DISENO.md §6): qué pasó y qué hacer, sin culpas. */

const NETWORK_MESSAGE = 'No pudimos conectarnos. Revisa tu internet y vuelve a intentar.';
const GENERIC_MESSAGE = 'Algo no salió bien de nuestro lado. Intenta otra vez en un momento.';

const BY_CODE: Record<string, string> = {
  // Auth de supabase-js
  invalid_credentials: 'El correo o la contraseña no coinciden. Revísalos y prueba otra vez.',
  user_already_exists: 'Ya hay una cuenta con ese correo. Prueba iniciando sesión.',
  email_exists: 'Ya hay una cuenta con ese correo. Prueba iniciando sesión.',
  weak_password: 'Esa contraseña está muy fácil. Usa al menos 8 caracteres.',
  email_address_invalid: 'Ese correo no parece válido. Revisa que esté bien escrito.',
  validation_failed: 'Ese correo no parece válido. Revisa que esté bien escrito.',
  over_request_rate_limit: 'Van muchos intentos seguidos. Espera un minuto y prueba otra vez.',
  over_email_send_rate_limit: 'Van muchos intentos seguidos. Espera un minuto y prueba otra vez.',
  signup_disabled: 'Por ahora no se pueden crear cuentas nuevas.',
  // RPC de pareja
  not_authenticated: 'Tu sesión se cerró. Inicia sesión de nuevo.',
  already_in_couple: 'Ya están en una pareja. Para cambiar, primero hay que salir de esa.',
  invalid_code: 'Ese código no tiene el formato correcto. Son 6 letras y números.',
  code_not_found: 'No encontramos ese código. Revisa que esté bien escrito.',
  couple_full: 'Ese código ya tiene a sus dos personas. Revisa con tu pareja que sea el correcto.',
  invalid_timezone: 'No reconocimos la zona horaria. Elige otra e intenta de nuevo.',
  // RPC de mood
  no_couple: 'Todavía no están juntos en ahorita. Termina de unirte con tu código.',
  invalid_mood: 'No pudimos guardar tu mood. Elige un emoji y una nota cortita.',
  // RPC de preguntas
  invalid_day: 'Ese día ya no se puede abrir. Solo se recuperan los últimos 7 días.',
  no_questions: 'Ya no quedan preguntas por ahora. Vuelve más tarde.',
  question_not_found: 'No encontramos esa pregunta. Regresa y elige otra.',
  invalid_answer: 'No pudimos guardar tu respuesta. Revisa que no esté vacía ni muy larga.',
  audio_too_short: 'Ese audio quedó muy corto. Grábalo otra vez.',
  not_answered: 'Para comentar, primero contesta la pregunta.',
  invalid_comment: 'No pudimos mandar el comentario. Hazlo más cortito e intenta otra vez.',
  comment_not_found: 'Ese comentario ya no está. Actualiza para ver lo más reciente.',
  invalid_reaction: 'No pudimos guardar la reacción. Prueba con otro emoji.',
  nudge_too_soon: 'Ya le avisaste hace un ratito. Dale un poco de tiempo.',
  no_partner: 'Esto es de a dos y aún no se une tu pareja. Cuando llegue, lo hacen juntos.',
  invalid_nudge: 'No pudimos mandar el aviso. Intenta otra vez.',
  // RPC de stories
  invalid_story: 'No pudimos subir tu story. Revisa que tenga algo y no sea muy larga.',
  too_many_stories: 'Ya tienes muchas stories activas. Espera a que caduquen o borra alguna.',
  invalid_memory:
    'No pudimos guardar la memoria. Revisa el título, la fecha y que no sea muy larga.',
  invalid_photos: 'Algo pasó con las fotos. Pueden ser de 1 a 10; elígelas otra vez.',
  memory_not_found: 'Esa memoria ya no está. Quizá la borraron desde el otro celular.',
  story_not_found: 'Esa story ya no está. Pudo caducar o la quitó quien la subió.',
  invalid_reply: 'No pudimos mandar tu respuesta. Hazla más cortita e intenta otra vez.',
  // RPC de cuentas regresivas, listas y distancia (Fase 8)
  invalid_event: 'No pudimos guardar la fecha. Revisa el nombre y el día.',
  event_not_found: 'Esa fecha ya no está. Quizá la borraron desde el otro celular.',
  invalid_list: 'No pudimos guardar la lista. Ponle un nombre cortito.',
  list_not_found: 'Esa lista ya no está. Quizá la borraron desde el otro celular.',
  invalid_item: 'No pudimos guardar eso. Escríbelo más cortito e intenta otra vez.',
  item_not_found: 'Eso ya no está en la lista. Actualiza para ver lo más reciente.',
  invalid_order: 'La lista cambió mientras la movías. Ya la actualizamos; intenta otra vez.',
  invalid_location: 'No pudimos guardar tu ubicación. Intenta otra vez en un momento.',
  // RPC de juegos (Fase 9)
  invalid_game: 'Ese juego no existe. Elige otro de la lista.',
  spicy_not_active: 'Las preguntas picantes aún no están activas para ustedes.',
  round_not_found: 'Esa ronda ya no está. Quizá la quitaron desde el otro celular.',
  round_finished: 'Esa ronda ya terminó. Entra a ver cómo les fue.',
  invalid_choice: 'No pudimos guardar tu respuesta. Elige una de las dos opciones.',
  item_not_in_round: 'Esa pregunta ya no está en la ronda. Actualiza e intenta otra vez.',
  drawing_not_found: 'Ese dibujo ya no está. Quizá lo quitaron desde el otro celular.',
  not_drawer: 'Solo quien dibuja puede hacer eso.',
  not_guesser: 'Solo quien adivina puede hacer eso.',
  invalid_drawing_state: 'El reto cambió mientras tanto. Ya lo actualizamos; intenta otra vez.',
  invalid_drawing: 'No pudimos mandar el dibujo. Revisa que tenga trazos e intenta otra vez.',
  invalid_guess: 'No pudimos mandar tu intento. Escribe una palabra e intenta otra vez.',
  no_rerolls: 'Ya cambiaste la palabra las 3 veces que se puede. A dibujar esta.',
  no_words: 'Por ahora no hay palabras. Vuelve más tarde.',
  // RPC de lenguajes del amor, visitas y estadísticas (Fase 11B)
  invalid_love_language: 'No pudimos guardar tus respuestas. Haz el test otra vez, por favor.',
  invalid_visit:
    'No pudimos guardar la visita. Revisa las fechas: no puede empezar en el futuro ni durar más de un año.',
  visit_overlap: 'Esas fechas se enciman con otra visita. Revisa el calendario.',
  visit_not_found: 'Esa visita ya no está. Quizá la borraron desde el otro celular.',
  // RPC de frutas (Fase 12A)
  invalid_fruit: 'Esa fruta no existe. Elige una de la lista.',
  fruit_taken: 'Esa es la fruta de tu pareja.',
  fruit_too_similar: 'Se parece mucho a la de tu pareja; elige otra.',
  // RPC de notificaciones
  invalid_token: 'No pudimos activar los avisos en este celular. Intenta otra vez.',
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
  if (code === '23514') return 'Alguno de los datos no cabe. Revísalos e intenta otra vez.';
  if (code === '42501') return 'No tienes permiso para hacer eso.';
  return GENERIC_MESSAGE;
}

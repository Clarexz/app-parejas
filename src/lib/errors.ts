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

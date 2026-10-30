/** Validadores de formularios: devuelven el mensaje de error o `null` si todo está bien. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INVITE_CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Escribe tu correo.';
  if (!EMAIL_RE.test(v)) return 'Ese correo no parece válido.';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Escribe una contraseña.';
  if (value.length < 8) return 'Usa al menos 8 caracteres.';
  return null;
}

export function validateDisplayName(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Escribe tu nombre.';
  if (v.length > 40) return 'Tu nombre puede tener hasta 40 caracteres.';
  return null;
}

/** El apodo es opcional. */
export function validateNickname(value: string): string | null {
  if (value.trim().length > 30) return 'El apodo puede tener hasta 30 caracteres.';
  return null;
}

/** Mayúsculas, sin espacios ni guiones. */
export function normalizeInviteCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

export function isValidInviteCode(code: string): boolean {
  return INVITE_CODE_RE.test(code);
}

/** "ABC234" -> "ABC 234". */
export function formatInviteCode(code: string): string {
  const c = normalizeInviteCode(code);
  return c.length > 3 ? `${c.slice(0, 3)} ${c.slice(3)}` : c;
}

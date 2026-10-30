import { errorMessage } from '../errors';

const NET = 'No hay señal con el servidor. Revisa tu internet y vuelve a intentar.';

describe('errorMessage', () => {
  it('traduce códigos de Auth', () => {
    expect(errorMessage({ code: 'invalid_credentials' })).toMatch(/correo o la contraseña/);
    expect(errorMessage({ code: 'user_already_exists' })).toMatch(/Ya hay una cuenta/);
    expect(errorMessage({ code: 'email_exists' })).toMatch(/Ya hay una cuenta/);
    expect(errorMessage({ code: 'weak_password' })).toMatch(/8 caracteres/);
    expect(errorMessage({ code: 'email_address_invalid' })).toMatch(/correo/);
    expect(errorMessage({ code: 'over_request_rate_limit' })).toMatch(/Espera/);
    expect(errorMessage({ code: 'signup_disabled' })).toMatch(/cuentas nuevas/);
  });

  it('detecta errores de red', () => {
    expect(errorMessage({ name: 'AuthRetryableFetchError', message: 'x', status: 0 })).toBe(NET);
    expect(errorMessage(new TypeError('Network request failed'))).toBe(NET);
    expect(errorMessage(new TypeError('Failed to fetch'))).toBe(NET);
  });

  it('traduce las claves de las RPC', () => {
    expect(errorMessage({ code: 'P0001', message: 'couple_full' })).toBe(
      'Ese código ya tiene a sus dos personas. Pídele a tu pareja que revise el código.',
    );
    expect(errorMessage({ code: 'P0001', message: 'code_not_found' })).toBe(
      'No encontramos ese código. Revisa que esté bien escrito.',
    );
    for (const key of [
      'not_authenticated',
      'already_in_couple',
      'invalid_code',
      'invalid_timezone',
    ]) {
      expect(errorMessage({ code: 'P0001', message: key })).not.toMatch(/Algo no salió/);
    }
  });

  it('traduce las claves de mood', () => {
    expect(errorMessage({ code: 'P0001', message: 'no_couple' })).toMatch(/vinculados/);
    expect(errorMessage({ code: 'P0001', message: 'invalid_mood' })).toMatch(/emoji/);
  });

  it('cubre check_violation y genérico', () => {
    expect(errorMessage({ code: '23514' })).toMatch(/no cumple/);
    expect(errorMessage(new Error('boom'))).toMatch(/Algo no salió/);
    expect(errorMessage(null)).toMatch(/Algo no salió/);
    expect(errorMessage('texto')).toMatch(/Algo no salió/);
  });

  it('traduce las claves de preguntas', () => {
    for (const key of [
      'invalid_day',
      'no_questions',
      'question_not_found',
      'invalid_answer',
      'not_answered',
      'invalid_comment',
      'comment_not_found',
      'invalid_reaction',
      'nudge_too_soon',
      'no_partner',
      'invalid_nudge',
    ]) {
      expect(errorMessage({ code: 'P0001', message: key })).not.toMatch(/Algo no salió/);
    }
    expect(errorMessage({ code: 'P0001', message: 'nudge_too_soon' })).toMatch(/hace un ratito/);
  });
});

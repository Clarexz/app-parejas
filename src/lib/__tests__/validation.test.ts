import {
  formatInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
  validateDisplayName,
  validateEmail,
  validateNickname,
  validatePassword,
} from '../validation';

describe('validadores', () => {
  it('correo', () => {
    expect(validateEmail('')).toBeTruthy();
    expect(validateEmail('a@b')).toBeTruthy();
    expect(validateEmail(' ana@correo.com ')).toBeNull();
  });
  it('contraseña', () => {
    expect(validatePassword('1234567')).toBeTruthy();
    expect(validatePassword('12345678')).toBeNull();
  });
  it('nombre', () => {
    expect(validateDisplayName('   ')).toBeTruthy();
    expect(validateDisplayName('a'.repeat(41))).toBeTruthy();
    expect(validateDisplayName(' Ana ')).toBeNull();
  });
  it('apodo opcional', () => {
    expect(validateNickname('')).toBeNull();
    expect(validateNickname('a'.repeat(31))).toBeTruthy();
    expect(validateNickname('a'.repeat(30))).toBeNull();
  });
});

describe('código de invitación', () => {
  it('normaliza', () => {
    expect(normalizeInviteCode(' abc-234 ')).toBe('ABC234');
  });
  it('valida el alfabeto', () => {
    expect(isValidInviteCode('ABC234')).toBe(true);
    expect(isValidInviteCode('ABC23')).toBe(false);
    expect(isValidInviteCode('ABCI34')).toBe(false);
    expect(isValidInviteCode('ABCL34')).toBe(false);
    expect(isValidInviteCode('ABCO34')).toBe(false);
    expect(isValidInviteCode('ABC134')).toBe(false);
    expect(isValidInviteCode('abc234')).toBe(false);
  });
  it('da formato', () => {
    expect(formatInviteCode('abc234')).toBe('ABC 234');
    expect(formatInviteCode('AB')).toBe('AB');
  });
});

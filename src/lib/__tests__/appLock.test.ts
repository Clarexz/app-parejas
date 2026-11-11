import {
  IMMEDIATE_GRACE_MS,
  isAppLockTimeout,
  shouldLock,
  timeoutLabel,
  type ShouldLockInput,
} from '../appLock';

const base: ShouldLockInput = {
  enabled: true,
  timeout: '1m',
  backgroundedAt: null,
  now: 1_000_000,
  coldStart: false,
};

describe('shouldLock', () => {
  it('desactivado nunca bloquea', () => {
    expect(shouldLock({ ...base, enabled: false, coldStart: true })).toBe(false);
    expect(shouldLock({ ...base, enabled: false, backgroundedAt: 0 })).toBe(false);
  });

  it('arranque en frío con el bloqueo activo bloquea', () => {
    expect(shouldLock({ ...base, coldStart: true })).toBe(true);
    expect(shouldLock({ ...base, coldStart: true, timeout: '5m' })).toBe(true);
  });

  it('sin ida a segundo plano no bloquea', () => {
    expect(shouldLock(base)).toBe(false);
  });

  it('"Al salir" tolera hasta 2 s y bloquea después', () => {
    const t = { ...base, timeout: 'immediate' as const };
    expect(shouldLock({ ...t, backgroundedAt: base.now - IMMEDIATE_GRACE_MS })).toBe(false);
    expect(shouldLock({ ...t, backgroundedAt: base.now - IMMEDIATE_GRACE_MS - 1 })).toBe(true);
  });

  it('1 minuto y 5 minutos', () => {
    expect(shouldLock({ ...base, backgroundedAt: base.now - 59_000 })).toBe(false);
    expect(shouldLock({ ...base, backgroundedAt: base.now - 60_000 })).toBe(true);
    const five = { ...base, timeout: '5m' as const };
    expect(shouldLock({ ...five, backgroundedAt: base.now - 299_000 })).toBe(false);
    expect(shouldLock({ ...five, backgroundedAt: base.now - 300_000 })).toBe(true);
  });
});

describe('timeoutLabel / isAppLockTimeout', () => {
  it('etiquetas en español', () => {
    expect(timeoutLabel('immediate')).toBe('Al salir');
    expect(timeoutLabel('1m')).toBe('1 minuto');
    expect(timeoutLabel('5m')).toBe('5 minutos');
  });

  it('valida valores', () => {
    expect(isAppLockTimeout('5m')).toBe(true);
    expect(isAppLockTimeout('10m')).toBe(false);
    expect(isAppLockTimeout(null)).toBe(false);
  });
});

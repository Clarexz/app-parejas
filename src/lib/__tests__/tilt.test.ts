import { tiltFor } from '../tilt';

describe('tiltFor', () => {
  it('es determinista', () => {
    expect(tiltFor('foto-1')).toBe(tiltFor('foto-1'));
    expect(tiltFor('foto-1', 2)).toBe(tiltFor('foto-1', 2));
  });

  it('respeta el rango y devuelve enteros', () => {
    for (let i = 0; i < 500; i++) {
      for (const range of [1, 2, 3]) {
        const t = tiltFor(`id-${i}`, range);
        expect(Number.isInteger(t)).toBe(true);
        expect(Math.abs(t)).toBeLessThanOrEqual(range);
      }
    }
  });

  it('con rango 0 siempre da 0 (sin -0)', () => {
    expect(Object.is(tiltFor('x', 0), 0)).toBe(true);
  });

  it('distribuye razonablemente en los 7 valores', () => {
    const counts = new Map<number, number>();
    const n = 2000;
    for (let i = 0; i < n; i++) {
      const t = tiltFor(`polaroid-${i}`);
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    expect(counts.size).toBe(7);
    for (const c of counts.values()) {
      expect(c).toBeGreaterThan(n / 7 / 2);
      expect(c).toBeLessThan((n / 7) * 2);
    }
  });
});

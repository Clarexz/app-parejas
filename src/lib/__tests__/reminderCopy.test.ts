import { reminderCopy } from '../reminderCopy';

describe('reminderCopy', () => {
  it('es determinista por seed y recorre las variantes', () => {
    const titles = [0, 1, 2, 3, 4, 5, 6, 7].map(
      (seed) => reminderCopy({ partner: 'Ale', seed }).title,
    );
    expect(reminderCopy({ partner: 'Ale', seed: 9 })).toEqual(
      reminderCopy({ partner: 'Ale', seed: 9 }),
    );
    expect(new Set(titles).size).toBeGreaterThanOrEqual(3);
    expect(titles[0]).toBe(titles[4]);
  });
  it('cabe en un push aunque el nombre sea largo', () => {
    const partner = 'Maria Guadalupe Hernandez de la Cruz Villanueva';
    for (let seed = 0; seed < 8; seed++) {
      const c = reminderCopy({ partner, seed });
      expect(c.title.length).toBeLessThanOrEqual(40);
      expect(c.body.length).toBeLessThanOrEqual(120);
    }
  });
  it('funciona sin pareja y sin dejar "null"', () => {
    for (const partner of [null, '', '   ']) {
      for (let seed = 0; seed < 8; seed++) {
        const c = reminderCopy({ partner, seed });
        expect(`${c.title} ${c.body}`).not.toMatch(/null|undefined/);
        expect(c.body.length).toBeGreaterThan(0);
      }
    }
  });
  it('nombra a la pareja cuando hay nombre', () => {
    expect(reminderCopy({ partner: 'Ale', seed: 0 }).body).toContain('Ale');
  });
});

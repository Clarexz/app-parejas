import {
  BLOCKED_PAIRS,
  FRUIT_KEYS,
  FRUITS,
  fruitClash,
  fruitOptions,
  isFruitKey,
  resolveFruits,
  tint,
} from '../fruits';

describe('frutas', () => {
  it('tiene las 7 del manual y cada sugerida es compatible', () => {
    expect(FRUIT_KEYS).toHaveLength(7);
    for (const key of FRUIT_KEYS) {
      expect(fruitClash(key, FRUITS[key].suggested)).toBeNull();
    }
  });

  it('bloquea la misma fruta y los pares que se parecen, en cualquier orden', () => {
    expect(fruitClash('uva', 'uva')).toBe('same');
    for (const [a, b] of BLOCKED_PAIRS) {
      expect(fruitClash(a, b)).toBe('similar');
      expect(fruitClash(b, a)).toBe('similar');
    }
    expect(fruitClash('sandia', 'mango')).toBeNull();
    expect(fruitClash('uva', 'limon')).toBeNull();
  });

  it('valida llaves', () => {
    expect(isFruitKey('pitaya')).toBe(true);
    expect(isFruitKey('fresa')).toBe(false);
    expect(isFruitKey(null)).toBe(false);
  });
});

describe('resolveFruits', () => {
  const A = { id: 'aaa', fruit: null };
  const B = { id: 'bbb', fruit: null };

  it('sin pareja usa la tuya o Sandía', () => {
    expect(resolveFruits(A, null)).toEqual({ me: 'sandia', partner: null });
    expect(resolveFruits({ id: 'x', fruit: 'uva' }, null)).toEqual({ me: 'uva', partner: null });
  });

  it('sin elegir: Sandía para el id menor y Mango para el mayor, igual en los dos celulares', () => {
    expect(resolveFruits(A, B)).toEqual({ me: 'sandia', partner: 'mango' });
    expect(resolveFruits(B, A)).toEqual({ me: 'mango', partner: 'sandia' });
  });

  it('si solo uno eligió, el otro toma la sugerida', () => {
    expect(resolveFruits({ ...A, fruit: 'uva' }, B)).toEqual({ me: 'uva', partner: 'limon' });
    expect(resolveFruits(B, { ...A, fruit: 'uva' })).toEqual({ me: 'limon', partner: 'uva' });
  });

  it('si chocan, el id menor se queda con la suya', () => {
    const a = { id: 'aaa', fruit: 'sandia' };
    const b = { id: 'bbb', fruit: 'pitaya' };
    expect(resolveFruits(a, b)).toEqual({ me: 'sandia', partner: 'mango' });
    expect(resolveFruits(b, a)).toEqual({ me: 'mango', partner: 'sandia' });
  });

  it('ignora valores desconocidos', () => {
    expect(resolveFruits({ id: 'aaa', fruit: 'fresa' }, B)).toEqual({
      me: 'sandia',
      partner: 'mango',
    });
  });
});

describe('fruitOptions', () => {
  it('marca bloqueadas y sugerida según la fruta de tu pareja', () => {
    const opts = fruitOptions('sandia');
    const by = Object.fromEntries(opts.map((o) => [o.fruit.key, o]));
    expect(by.sandia.blocked).toBe('same');
    expect(by.pitaya.blocked).toBe('similar');
    expect(by.mandarina.blocked).toBe('similar');
    expect(by.mango.suggested).toBe(true);
    expect(by.uva.blocked).toBeNull();
  });

  it('sin pareja no bloquea nada', () => {
    expect(fruitOptions(null).every((o) => !o.blocked && !o.suggested)).toBe(true);
  });
});

describe('tint', () => {
  it('mezcla en sRGB', () => {
    expect(tint('#FFFFFF', '#000000', 0.5)).toBe('#808080');
    expect(tint('#F2495C', '#FFFDF8', 0)).toBe('#FFFDF8');
    expect(tint('#F2495C', '#FFFDF8', 1)).toBe('#F2495C');
  });
});

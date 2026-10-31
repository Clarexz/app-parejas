import {
  LIST_KINDS,
  applyClearDone,
  applyOrder,
  applyRemove,
  applyText,
  applyToggle,
  doneByLabel,
  isListKind,
  isTempId,
  itemCounts,
  listItemError,
  listKindLabel,
  listTitleError,
  moveItem,
  nextPosition,
  progressLabel,
  progressRatio,
  reorderedIds,
  replaceItem,
  sortItems,
  splitItems,
  type ItemLike,
} from '../lists';

const item = (
  id: string,
  position: number,
  done = false,
  done_by: string | null = null,
): ItemLike => ({
  id,
  text: `Renglón ${id}`,
  done,
  done_by,
  done_at: done ? '2026-10-30T10:00:00Z' : null,
  position,
});

describe('tipos de lista', () => {
  it('tiene los seis tipos del servidor con etiqueta', () => {
    expect(LIST_KINDS.map((k) => k.kind)).toEqual([
      'trip',
      'groceries',
      'bucket',
      'watch',
      'places',
      'other',
    ]);
    expect(LIST_KINDS.every((k) => k.label.length > 0 && k.placeholder.length > 0)).toBe(true);
  });

  it('etiqueta y validación de tipo', () => {
    expect(listKindLabel('groceries')).toBe('Súper');
    expect(listKindLabel('raro')).toBe('Otra');
    expect(isListKind('watch')).toBe(true);
    expect(isListKind('raro')).toBe(false);
  });
});

describe('validación', () => {
  it('título', () => {
    expect(listTitleError('  ')).not.toBeNull();
    expect(listTitleError('Súper')).toBeNull();
    expect(listTitleError('x'.repeat(61))).not.toBeNull();
    expect(listTitleError('x'.repeat(60))).toBeNull();
  });

  it('renglón', () => {
    expect(listItemError('')).not.toBeNull();
    expect(listItemError(' leche ')).toBeNull();
    expect(listItemError('x'.repeat(201))).not.toBeNull();
  });
});

describe('orden y progreso', () => {
  const items = [item('a', 2), item('b', 0, true), item('c', 1), item('d', 3, true)];

  it('splitItems separa pendientes y tachados por posición', () => {
    const { pending, done } = splitItems(items);
    expect(pending.map((i) => i.id)).toEqual(['c', 'a']);
    expect(done.map((i) => i.id)).toEqual(['b', 'd']);
  });

  it('sortItems pone los pendientes primero', () => {
    expect(sortItems(items).map((i) => i.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('cuenta y etiqueta el progreso', () => {
    expect(itemCounts(items)).toEqual({ done: 2, total: 4 });
    expect(progressLabel(3, 8)).toBe('3 de 8');
    expect(progressLabel(0, 0)).toBe('Vacía');
    expect(progressLabel(8, 8)).toBe('Todo tachado');
    expect(progressLabel(1, 1)).toBe('Ya está tachado');
    expect(progressRatio(2, 4)).toBe(0.5);
    expect(progressRatio(0, 0)).toBe(0);
    expect(progressRatio(9, 4)).toBe(1);
  });
});

describe('quién tachó', () => {
  it('distingue tú, tu pareja y pendiente', () => {
    expect(doneByLabel(item('a', 0), 'u1', 'Caleb')).toBeNull();
    expect(doneByLabel(item('a', 0, true, 'u1'), 'u1', 'Caleb')).toBe('Lo tachaste tú');
    expect(doneByLabel(item('a', 0, true, 'u2'), 'u1', 'Caleb')).toBe('Lo tachó Caleb');
    expect(doneByLabel(item('a', 0, true, 'u2'), 'u1', null)).toBe('Lo tachó tu pareja');
  });
});

describe('reordenar', () => {
  it('moveItem mueve y acota', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, -4)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b', 'c'], 5, 0)).toEqual(['a', 'b', 'c']);
  });

  it('reorderedIds trae todos los ids con los tachados al final', () => {
    const items = [item('a', 0), item('b', 1, true), item('c', 2), item('d', 3)];
    expect(reorderedIds(items, 0, 1)).toEqual(['c', 'a', 'd', 'b']);
    expect(reorderedIds(items, 2, 0)).toHaveLength(4);
  });

  it('applyOrder reasigna posiciones 0..n-1', () => {
    const out = applyOrder([item('a', 0), item('b', 1), item('c', 2)], ['c', 'a', 'b']);
    expect(out.map((i) => [i.id, i.position])).toEqual([
      ['c', 0],
      ['a', 1],
      ['b', 2],
    ]);
  });
});

describe('actualizaciones optimistas', () => {
  const base = [item('a', 0), item('b', 1)];

  it('applyToggle marca y desmarca con quién y cuándo', () => {
    const on = applyToggle(base, 'a', true, 'u1', '2026-10-31T00:00:00Z');
    expect(on[0]).toMatchObject({ done: true, done_by: 'u1', done_at: '2026-10-31T00:00:00Z' });
    const off = applyToggle(on, 'a', false, 'u1', 'x');
    expect(off[0]).toMatchObject({ done: false, done_by: null, done_at: null });
    expect(base[0].done).toBe(false);
  });

  it('applyText, applyRemove y applyClearDone', () => {
    expect(applyText(base, 'a', '  leche ')[0].text).toBe('leche');
    expect(applyRemove(base, 'a').map((i) => i.id)).toEqual(['b']);
    expect(applyClearDone([item('a', 0, true), item('b', 1)]).map((i) => i.id)).toEqual(['b']);
  });

  it('nextPosition va al final', () => {
    expect(nextPosition([])).toBe(0);
    expect(nextPosition([{ position: 4 }, { position: 1 }])).toBe(5);
  });

  it('replaceItem cambia el provisional por el real (o lo agrega)', () => {
    const temp = item('tmp-1', 2);
    const real = item('real', 2);
    expect(replaceItem([...base, temp], 'tmp-1', real).map((i) => i.id)).toEqual([
      'a',
      'b',
      'real',
    ]);
    expect(replaceItem(base, 'tmp-1', real).map((i) => i.id)).toEqual(['a', 'b', 'real']);
    expect(isTempId('tmp-1')).toBe(true);
    expect(isTempId('real')).toBe(false);
  });
});

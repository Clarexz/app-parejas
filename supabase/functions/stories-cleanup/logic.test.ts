/** @jest-environment node */
import {
  chunk,
  parseBatch,
  REMOVE_CHUNK_SIZE,
  storiesToCommit,
  timingSafeEqual,
  type CleanupItem,
} from './logic';

describe('parseBatch', () => {
  it('acepta la forma de stories_cleanup_batch', () => {
    const b = parseBatch({
      story_ids: ['s1', 's2'],
      paths: ['a/b/1.jpg', 'a/b/1_thumb.jpg', 'a/b/huerfano.jpg'],
      items: [
        { id: 's1', paths: ['a/b/1.jpg', 'a/b/1_thumb.jpg'] },
        { id: 's2', paths: [] },
      ],
    });
    expect(b?.storyIds).toEqual(['s1', 's2']);
    expect(b?.paths).toHaveLength(3);
    expect(b?.items).toEqual([
      { id: 's1', paths: ['a/b/1.jpg', 'a/b/1_thumb.jpg'] },
      { id: 's2', paths: [] },
    ]);
  });
  it('sin items asume que cada story depende de todos los archivos', () => {
    const b = parseBatch({ story_ids: ['s1'], paths: ['p1', 'p2'] });
    expect(b?.items).toEqual([{ id: 's1', paths: ['p1', 'p2'] }]);
  });
  it('filtra basura dentro de las listas', () => {
    const b = parseBatch({
      story_ids: ['s1', 3, null, ''],
      paths: ['p1', 7, ''],
      items: [{ id: 's1', paths: ['p1', 2] }, { paths: [] }, 'x'],
    });
    expect(b?.storyIds).toEqual(['s1']);
    expect(b?.paths).toEqual(['p1']);
    expect(b?.items).toEqual([{ id: 's1', paths: ['p1'] }]);
  });
  it('rechaza formas inesperadas', () => {
    expect(parseBatch(null)).toBeNull();
    expect(parseBatch('x')).toBeNull();
    expect(parseBatch([])).toBeNull();
    expect(parseBatch({ story_ids: [] })).toBeNull();
    expect(parseBatch({ story_ids: 'x', paths: [] })).toBeNull();
  });
  it('un lote vacío es válido', () => {
    expect(parseBatch({ story_ids: [], paths: [] })).toEqual({
      storyIds: [],
      paths: [],
      items: [],
    });
  });
});

describe('chunk', () => {
  it('parte en lotes de 100', () => {
    const list = Array.from({ length: 250 }, (_, i) => i);
    const parts = chunk(list, REMOVE_CHUNK_SIZE);
    expect(parts.map((p) => p.length)).toEqual([100, 100, 50]);
    expect(parts.flat()).toEqual(list);
  });
  it('lista vacía y tamaños raros', () => {
    expect(chunk([], 100)).toEqual([]);
    expect(chunk([1, 2, 3], 0)).toEqual([[1], [2], [3]]);
    expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
  });
});

describe('storiesToCommit', () => {
  const items: CleanupItem[] = [
    { id: 'foto', paths: ['f.jpg', 'f_thumb.jpg'] },
    { id: 'texto', paths: [] },
    { id: 'otra', paths: ['o.jpg', 'o_thumb.jpg'] },
  ];
  it('todo bien: se confirman todas', () => {
    expect(storiesToCommit(items, new Set())).toEqual(['foto', 'texto', 'otra']);
  });
  it('si falla un archivo, esa story se queda para reintentar', () => {
    expect(storiesToCommit(items, new Set(['f_thumb.jpg']))).toEqual(['texto', 'otra']);
  });
  it('las stories sin archivos siempre se confirman', () => {
    expect(storiesToCommit(items, new Set(['f.jpg', 'f_thumb.jpg', 'o.jpg']))).toEqual(['texto']);
  });
  it('lista vacía', () => {
    expect(storiesToCommit([], new Set(['x']))).toEqual([]);
  });
});

describe('timingSafeEqual', () => {
  it('compara', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(timingSafeEqual('', '')).toBe(true);
  });
});

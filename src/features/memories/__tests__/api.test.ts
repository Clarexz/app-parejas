import { deleteMemory, fetchMemories, memoryMediaUrls, saveMemory } from '../api';

const mockRpc = jest.fn();
const mockUpload = jest.fn();
const mockSignedUrls = jest.fn();
const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...a: unknown[]) => mockRpc(...a),
    from: (...a: unknown[]) => mockFrom(...a),
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
    storage: {
      from: () => ({
        upload: (...a: unknown[]) => mockUpload(...a),
        createSignedUrls: (...a: unknown[]) => mockSignedUrls(...a),
      }),
    },
  },
}));
jest.mock('@/lib/image', () => ({
  toJpeg: jest.fn(async (_uri: string, side: number) => ({
    data: new ArrayBuffer(side),
    width: side,
    height: side / 2,
  })),
}));
jest.mock('@/lib/ids', () => {
  let n = 0;
  return { randomUuid: () => `file-${++n}` };
});
jest.mock('expo-file-system', () => ({}));
jest.mock('expo-media-library', () => ({}));

const row = {
  id: 'm1',
  couple_id: 'c1',
  created_by: 'u1',
  title: 'Playa',
  body: null,
  happened_on: '2026-10-01',
  lat: null,
  lng: null,
  place_name: null,
  created_at: '2026-10-02T00:00:00Z',
  updated_at: '2026-10-02T00:00:00Z',
};

beforeEach(() => {
  mockRpc.mockReset();
  mockUpload.mockReset().mockResolvedValue({ error: null });
  mockSignedUrls.mockReset();
  mockFrom.mockReset();
});

describe('saveMemory', () => {
  function rpcs() {
    mockRpc.mockImplementation(async (name: string) =>
      name === 'my_couple_id' ? { data: 'c1', error: null } : { data: row, error: null },
    );
  }

  it('sube las fotos nuevas, conserva las existentes en orden y llama a create_memory', async () => {
    rpcs();
    const progress: number[] = [];
    const memory = await saveMemory(
      {
        title: '  Playa ',
        happenedOn: '2026-10-01',
        body: '  ',
        placeName: ' Tulum ',
        lat: 20.2,
        lng: -87.4,
        photos: [
          {
            kind: 'existing',
            path: 'c1/u2/old.jpg',
            thumbPath: 'c1/u2/old_thumb.jpg',
            width: 10,
            height: 5,
          },
          { kind: 'new', uri: 'file:///a.jpg' },
        ],
      },
      (p) => progress.push(p),
    );
    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(mockUpload.mock.calls.map((c) => c[0])).toEqual([
      'c1/u1/file-1.jpg',
      'c1/u1/file-1_thumb.jpg',
    ]);
    expect(mockRpc).toHaveBeenCalledWith('create_memory', {
      p_title: 'Playa',
      p_happened_on: '2026-10-01',
      p_body: undefined,
      p_lat: 20.2,
      p_lng: -87.4,
      p_place_name: 'Tulum',
      p_photos: [
        { path: 'c1/u2/old.jpg', thumb_path: 'c1/u2/old_thumb.jpg', width: 10, height: 5 },
        {
          path: 'c1/u1/file-1.jpg',
          thumb_path: 'c1/u1/file-1_thumb.jpg',
          width: 1600,
          height: 800,
        },
      ],
    });
    expect(memory.photos.map((p) => [p.position, p.path])).toEqual([
      [0, 'c1/u2/old.jpg'],
      [1, 'c1/u1/file-1.jpg'],
    ]);
    expect(progress[0]).toBe(0);
    expect(progress[progress.length - 1]).toBe(1);
    expect([...progress].sort((a, b) => a - b)).toEqual(progress);
  });

  it('con id llama a update_memory y sin fotos nuevas no consulta la pareja', async () => {
    mockRpc.mockResolvedValue({ data: row, error: null });
    await saveMemory({
      id: 'm1',
      title: 'Playa',
      happenedOn: '2026-10-01',
      photos: [{ kind: 'existing', path: 'a.b/c.jpg', thumbPath: 'a.b/c_thumb.jpg' }],
    });
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc.mock.calls[0][0]).toBe('update_memory');
    expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_memory_id: 'm1', p_lat: undefined });
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('propaga el error de la RPC y de la subida', async () => {
    mockRpc.mockImplementation(async (name: string) =>
      name === 'my_couple_id'
        ? { data: 'c1', error: null }
        : { data: null, error: { code: 'P0001', message: 'invalid_memory' } },
    );
    await expect(
      saveMemory({ title: 'x', happenedOn: '2026-10-01', photos: [{ kind: 'new', uri: 'f' }] }),
    ).rejects.toMatchObject({ message: 'invalid_memory' });

    rpcs();
    mockUpload.mockResolvedValueOnce({ error: new Error('storage') });
    await expect(
      saveMemory({ title: 'x', happenedOn: '2026-10-01', photos: [{ kind: 'new', uri: 'f' }] }),
    ).rejects.toThrow('storage');
  });

  it('sin pareja falla con no_couple', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(
      saveMemory({ title: 'x', happenedOn: '2026-10-01', photos: [{ kind: 'new', uri: 'f' }] }),
    ).rejects.toThrow('no_couple');
  });
});

describe('deleteMemory', () => {
  it('llama a la RPC y propaga errores', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await deleteMemory('m1');
    expect(mockRpc).toHaveBeenCalledWith('delete_memory', { p_memory_id: 'm1' });
    mockRpc.mockResolvedValueOnce({ error: new Error('x') });
    await expect(deleteMemory('m1')).rejects.toThrow('x');
  });
});

describe('fetchMemories', () => {
  it('ordena las fotos por posición', async () => {
    const result = {
      data: [
        {
          ...row,
          photos: [
            { id: 'b', position: 1 },
            { id: 'a', position: 0 },
          ],
        },
        { ...row, id: 'm2', photos: null },
      ],
      error: null,
    };
    const chain: Record<string, unknown> = {};
    for (const k of ['select', 'eq', 'order']) chain[k] = () => chain;
    chain.limit = async () => result;
    mockFrom.mockReturnValue(chain);
    const out = await fetchMemories('c1');
    expect(out[0].photos.map((p) => p.id)).toEqual(['a', 'b']);
    expect(out[1].photos).toEqual([]);
  });
});

describe('memoryMediaUrls', () => {
  it('pide en lote solo lo que falta y reutiliza la caché', async () => {
    mockSignedUrls.mockResolvedValueOnce({
      data: [
        { path: 'p/1.jpg', signedUrl: 'https://u/1', error: null },
        { path: 'p/2.jpg', signedUrl: 'https://u/2', error: null },
      ],
      error: null,
    });
    expect(await memoryMediaUrls(['p/1.jpg', 'p/2.jpg', 'p/1.jpg'])).toEqual({
      'p/1.jpg': 'https://u/1',
      'p/2.jpg': 'https://u/2',
    });
    expect(mockSignedUrls.mock.calls[0][0]).toEqual(['p/1.jpg', 'p/2.jpg']);

    mockSignedUrls.mockResolvedValueOnce({
      data: [{ path: 'p/3.jpg', signedUrl: 'https://u/3', error: null }],
      error: null,
    });
    const out = await memoryMediaUrls(['p/1.jpg', 'p/3.jpg']);
    expect(mockSignedUrls).toHaveBeenCalledTimes(2);
    expect(mockSignedUrls.mock.calls[1][0]).toEqual(['p/3.jpg']);
    expect(out['p/1.jpg']).toBe('https://u/1');
    expect(out['p/3.jpg']).toBe('https://u/3');

    await memoryMediaUrls(['p/1.jpg']);
    expect(mockSignedUrls).toHaveBeenCalledTimes(2);
  });

  it('omite las rutas que fallan y propaga el error general', async () => {
    mockSignedUrls.mockResolvedValueOnce({
      data: [{ path: 'q/1.jpg', signedUrl: null, error: 'nope' }],
      error: null,
    });
    expect(await memoryMediaUrls(['q/1.jpg'])).toEqual({});
    mockSignedUrls.mockResolvedValueOnce({ data: null, error: new Error('boom') });
    await expect(memoryMediaUrls(['q/2.jpg'])).rejects.toThrow('boom');
  });
});

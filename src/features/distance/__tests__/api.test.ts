import { clearMyLocation, fetchLocations, setMyLocation } from '../api';

const mockEq = jest.fn();
const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({ eq: (...a: unknown[]) => mockEq(table, ...a) }),
    }),
    rpc: (...a: unknown[]) => mockRpc(...a),
  },
}));

beforeEach(() => {
  mockEq.mockReset();
  mockRpc.mockReset();
});

describe('api de distancia', () => {
  it('lee las ubicaciones de la pareja', async () => {
    mockEq.mockResolvedValue({ data: [{ user_id: 'u1' }], error: null });
    await expect(fetchLocations('c1')).resolves.toEqual([{ user_id: 'u1' }]);
    expect(mockEq).toHaveBeenCalledWith('locations', 'couple_id', 'c1');
  });

  it('propaga el error de lectura', async () => {
    const error = { message: 'boom' };
    mockEq.mockResolvedValue({ data: null, error });
    await expect(fetchLocations('c1')).rejects.toBe(error);
  });

  it('set_my_location manda lat, lng y ciudad (o nada)', async () => {
    mockRpc.mockResolvedValue({ data: { user_id: 'u1' }, error: null });
    await setMyLocation({ lat: 19.43, lng: -99.13, city: 'CDMX' });
    expect(mockRpc).toHaveBeenLastCalledWith('set_my_location', {
      p_lat: 19.43,
      p_lng: -99.13,
      p_city: 'CDMX',
    });
    await setMyLocation({ lat: 1, lng: 2, city: null });
    expect(mockRpc).toHaveBeenLastCalledWith('set_my_location', {
      p_lat: 1,
      p_lng: 2,
      p_city: undefined,
    });
  });

  it('clear_my_location lanza si el servidor falla', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await expect(clearMyLocation()).resolves.toBeUndefined();
    mockRpc.mockResolvedValueOnce({ error: { message: 'x' } });
    await expect(clearMyLocation()).rejects.toEqual({ message: 'x' });
    expect(mockRpc).toHaveBeenCalledWith('clear_my_location');
  });
});

import { locationTask } from '../backgroundTask';

const mockSend = jest.fn(async (..._args: unknown[]) => 'sent');
const mockGetSession = jest.fn(async () => ({ data: { session: { user: { id: 'u1' } } } }));
const mockDefine = jest.fn();

jest.mock('expo-task-manager', () => ({ defineTask: (...a: unknown[]) => mockDefine(...a) }));
jest.mock('../locationService', () => ({
  LOCATION_TASK: 'distance-location-task',
  sendLocation: (...a: unknown[]) => mockSend(...a),
}));
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: () => mockGetSession() } },
}));

const batch = (...points: [number, number][]) => ({
  locations: points.map(([latitude, longitude]) => ({ coords: { latitude, longitude } })),
});

beforeEach(() => {
  mockSend.mockClear();
  mockGetSession.mockClear();
});

describe('locationTask', () => {
  it('manda la ubicación más reciente del lote', async () => {
    await locationTask({ data: batch([1, 2], [19.43, -99.13]) }, 123);
    expect(mockSend).toHaveBeenCalledWith({ lat: 19.43, lng: -99.13 }, { now: 123 });
  });

  it('no hace nada con error, lote vacío o sin datos', async () => {
    await locationTask({ error: new Error('x') });
    await locationTask({ data: { locations: [] } });
    await locationTask({ data: null });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sin sesión no manda nada', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } } as never);
    await locationTask({ data: batch([1, 2]) });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('nunca lanza', async () => {
    mockSend.mockRejectedValueOnce(new Error('sin red'));
    await expect(locationTask({ data: batch([1, 2]) })).resolves.toBeUndefined();
    mockGetSession.mockRejectedValueOnce(new Error('boom'));
    await expect(locationTask({ data: batch([1, 2]) })).resolves.toBeUndefined();
  });
});

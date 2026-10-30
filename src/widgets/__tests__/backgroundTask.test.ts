import {
  MIN_FETCH_INTERVAL_MS,
  resetThrottle,
  syncWidgetsFromServer,
  widgetNotificationTask,
} from '../backgroundTask';

const mockFetch = jest.fn(async () => ({ status: 'ready' }));
const mockSave = jest.fn(async (_s: unknown) => {});

jest.mock('../fetchSnapshot', () => ({ fetchSnapshot: () => mockFetch() }));
jest.mock('../update', () => ({ saveAndRefresh: (s: unknown) => mockSave(s) }));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));

beforeEach(() => {
  resetThrottle();
  mockFetch.mockClear();
  mockSave.mockClear();
});

describe('widgetNotificationTask', () => {
  it('lee y guarda con un push de datos', async () => {
    await widgetNotificationTask({ data: { notification: {} } });
    expect(mockSave).toHaveBeenCalledWith({ status: 'ready' });
  });

  it('ignora respuestas a acciones', async () => {
    await widgetNotificationTask({ data: { actionIdentifier: 'x' } });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('nunca lanza', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom'));
    await expect(widgetNotificationTask({ data: {} })).resolves.toBeUndefined();
  });
});

describe('syncWidgetsFromServer', () => {
  it('limita a una lectura cada 20 s', async () => {
    await syncWidgetsFromServer(100_000);
    await syncWidgetsFromServer(100_000 + MIN_FETCH_INTERVAL_MS - 1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    await syncWidgetsFromServer(100_000 + MIN_FETCH_INTERVAL_MS);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('sin snapshot (error de red) no guarda', async () => {
    mockFetch.mockResolvedValueOnce(null as never);
    await syncWidgetsFromServer(500_000);
    expect(mockSave).not.toHaveBeenCalled();
  });
});

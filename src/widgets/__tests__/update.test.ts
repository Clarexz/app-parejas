import { Platform } from 'react-native';

import { buildWidgetSnapshot, WIDGET_NAMES } from '@/lib/widgets';

import { readSnapshot } from '../storage';
import { refreshWidgets, saveAndRefresh } from '../update';

const mockRequestWidgetUpdate = jest.fn(async (_props: unknown) => {});
const mockStore = new Map<string, string>();

jest.mock('react-native-android-widget', () => ({
  requestWidgetUpdate: (props: unknown) => mockRequestWidgetUpdate(props),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockStore.set(k, v);
    }),
  },
}));
jest.mock('../render', () => ({ renderWidget: jest.fn(() => ({})) }));

const snap = (anniversary = '2024-01-10') =>
  buildWidgetSnapshot({
    anniversary,
    timezone: 'America/Mexico_City',
    me: { name: 'Ana', birthday: null },
    partner: { name: 'Beto', birthday: null },
    partnerMood: null,
  });

beforeAll(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
});

beforeEach(() => {
  mockStore.clear();
  mockRequestWidgetUpdate.mockClear();
});

describe('refreshWidgets', () => {
  it('pide actualizar todos los widgets', async () => {
    await refreshWidgets(snap());
    const names = mockRequestWidgetUpdate.mock.calls.map(
      (c) => (c[0] as { widgetName: string }).widgetName,
    );
    expect(names.sort()).toEqual(['Countdown', 'DaysTogether', 'PartnerMood', 'PartnerStory']);
  });

  it('nunca lanza', async () => {
    mockRequestWidgetUpdate.mockRejectedValueOnce(new Error('boom'));
    await expect(refreshWidgets(snap())).resolves.toBeUndefined();
  });
});

describe('saveAndRefresh', () => {
  it('guarda y redibuja la primera vez', async () => {
    await saveAndRefresh(snap());
    expect(await readSnapshot()).not.toBeNull();
    expect(mockRequestWidgetUpdate).toHaveBeenCalledTimes(WIDGET_NAMES.length);
  });

  it('no redibuja si no cambió nada visible', async () => {
    await saveAndRefresh(snap());
    mockRequestWidgetUpdate.mockClear();
    await saveAndRefresh({ ...snap(), updatedAt: '2030-01-01T00:00:00.000Z' });
    expect(mockRequestWidgetUpdate).not.toHaveBeenCalled();
    expect((await readSnapshot())?.updatedAt).toBe('2030-01-01T00:00:00.000Z');
  });

  it('redibuja si cambió', async () => {
    await saveAndRefresh(snap());
    mockRequestWidgetUpdate.mockClear();
    await saveAndRefresh(snap('2023-05-05'));
    expect(mockRequestWidgetUpdate).toHaveBeenCalledTimes(WIDGET_NAMES.length);
  });
});

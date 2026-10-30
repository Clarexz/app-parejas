import { buildWidgetSnapshot, type WidgetSnapshot } from '@/lib/widgets';

import { widgetTaskHandler } from '../taskHandler';

const mockFetch = jest.fn<Promise<WidgetSnapshot | null>, []>();
const mockRefresh = jest.fn(async (_s?: unknown) => {});
const mockRender = jest.fn((..._args: unknown[]) => ({ tag: 'widget' }));
let mockSaved: WidgetSnapshot | null = null;

jest.mock('../fetchSnapshot', () => ({ fetchSnapshot: () => mockFetch() }));
jest.mock('../update', () => ({ refreshWidgets: (s: unknown) => mockRefresh(s) }));
jest.mock('../render', () => ({ renderWidget: (...a: unknown[]) => mockRender(...a) }));
jest.mock('../storage', () => ({
  readSnapshot: jest.fn(async () => mockSaved),
  writeSnapshot: jest.fn(async (s: WidgetSnapshot) => {
    mockSaved = s;
  }),
}));

const snap = (updatedAt = new Date()) =>
  buildWidgetSnapshot({
    anniversary: '2024-01-10',
    timezone: 'America/Mexico_City',
    me: { name: 'Ana', birthday: null },
    partner: { name: 'Beto', birthday: null },
    partnerMood: null,
    now: updatedAt,
  });

const props = (widgetName: string, widgetAction: string) =>
  ({
    widgetInfo: { widgetName, widgetId: 1, width: 150, height: 120 },
    widgetAction,
    renderWidget: jest.fn(),
  }) as never as Parameters<typeof widgetTaskHandler>[0] & { renderWidget: jest.Mock };

beforeEach(() => {
  mockSaved = null;
  mockFetch.mockReset();
  mockRefresh.mockClear();
  mockRender.mockClear();
});

describe('widgetTaskHandler', () => {
  it('dibuja con el snapshot guardado al agregar el widget', async () => {
    mockSaved = snap();
    const p = props('DaysTogether', 'WIDGET_ADDED');
    await widgetTaskHandler(p);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockRender).toHaveBeenCalledWith(
      'DaysTogether',
      expect.objectContaining({ status: 'ready', stale: false }),
      { width: 150, height: 120 },
    );
    expect(p.renderWidget).toHaveBeenCalledWith({ tag: 'widget' });
  });

  it('ignora nombres desconocidos', async () => {
    const p = props('Otro', 'WIDGET_UPDATE');
    await widgetTaskHandler(p);
    expect(p.renderWidget).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sin snapshot dibuja el estado de sesión cerrada', async () => {
    const p = props('PartnerMood', 'WIDGET_RESIZED');
    await widgetTaskHandler(p);
    expect(mockRender).toHaveBeenCalledWith(
      'PartnerMood',
      expect.objectContaining({ status: 'signed_out' }),
      expect.anything(),
    );
  });

  it('en la actualización periódica refresca si el snapshot está viejo', async () => {
    mockSaved = snap(new Date(Date.now() - 3 * 3_600_000));
    const fresh = snap();
    mockFetch.mockResolvedValue(fresh);
    const p = props('Countdown', 'WIDGET_UPDATE');
    await widgetTaskHandler(p);
    expect(mockSaved).toBe(fresh);
    expect(mockRefresh).toHaveBeenCalledWith(fresh);
    expect(p.renderWidget).toHaveBeenCalledTimes(1);
  });

  it('si no hay red conserva el snapshot viejo', async () => {
    const old = snap(new Date(Date.now() - 3 * 3_600_000));
    mockSaved = old;
    mockFetch.mockResolvedValue(null);
    const p = props('Countdown', 'WIDGET_UPDATE');
    await widgetTaskHandler(p);
    expect(mockSaved).toBe(old);
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(p.renderWidget).toHaveBeenCalledTimes(1);
  });

  it('no lee del servidor si el snapshot está fresco', async () => {
    mockSaved = snap();
    await widgetTaskHandler(props('Countdown', 'WIDGET_UPDATE'));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WIDGET_CLICK no hace nada', async () => {
    const p = props('Countdown', 'WIDGET_CLICK');
    await widgetTaskHandler(p);
    expect(p.renderWidget).not.toHaveBeenCalled();
  });
});

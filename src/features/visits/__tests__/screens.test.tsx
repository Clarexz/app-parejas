import { fireEvent, render, screen } from '@testing-library/react-native';

import { ToastProvider } from '@/components/Toast';
import { ThemeProvider } from '@/theme';

import type { VisitRow } from '../api';
import { VisitEditor } from '../components/VisitEditor';
import { VisitsScreen } from '../components/VisitsScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({ couple: { id: 'c1', anniversary_date: '2025-10-01' } }),
  useToday: () => ({ today: '2026-10-31', timeZone: 'America/Mexico_City' }),
}));

let mockEvents: { id: string; kind: string; date: string; title: string }[] = [];
let mockNext: unknown = null;
jest.mock('@/features/events', () => ({
  useCountdowns: () => ({ visit: mockNext, events: mockEvents, today: '2026-10-31' }),
  useEvents: () => ({ events: mockEvents }),
}));

let mockVisits: VisitRow[] = [];
let mockState = { isLoading: false, isError: false };
const mockSave = jest.fn();
const mockRefetch = jest.fn();
jest.mock('../hooks', () => ({
  useVisits: () => ({
    visits: mockVisits,
    ...mockState,
    refetch: mockRefetch,
    isRefetching: false,
  }),
  useVisitsRealtime: jest.fn(),
  useSaveVisit: () => ({ mutate: mockSave, isPending: false }),
  useDeleteVisit: () => ({ mutate: jest.fn(), isPending: false }),
}));

const visit = (id: string, start_date: string, end_date: string, extra = {}): VisitRow => ({
  id,
  couple_id: 'c1',
  created_by: 'u1',
  event_id: null,
  start_date,
  end_date,
  place: null,
  note: null,
  created_at: '',
  updated_at: '',
  ...extra,
});

const wrap = (ui: React.ReactElement) =>
  render(
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockVisits = [];
  mockEvents = [];
  mockNext = null;
  mockState = { isLoading: false, isError: false };
});

describe('Visitas', () => {
  it('vacío: invita a apuntar la primera', async () => {
    await wrap(<VisitsScreen />);
    expect(screen.getByText('Todavía no apuntan ninguna visita')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Apuntar la primera' }));
    expect(mockPush).toHaveBeenCalledWith('/visits/edit');
  });

  it('error: permite reintentar', async () => {
    mockState = { isLoading: false, isError: true };
    await wrap(<VisitsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('con visitas: días sin verse, lista y estadísticas', async () => {
    mockVisits = [
      visit('b', '2026-10-10', '2026-10-18', { place: 'Guadalajara' }),
      visit('a', '2026-09-01', '2026-09-03'),
    ];
    await wrap(<VisitsScreen />);
    expect(screen.getByText('13 días sin verse')).toBeTruthy();
    expect(screen.getByText('12 días juntos')).toBeTruthy();
    expect(screen.getByText('10–18 OCT 2026')).toBeTruthy();
    expect(screen.getByText('Guadalajara')).toBeTruthy();
    expect(screen.getByText('Visita más larga')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/^Visita 10–18 oct 2026/));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/visits/edit', params: { id: 'b' } });
  });

  it('visita en curso: están juntos', async () => {
    mockVisits = [visit('a', '2026-10-29', '2026-11-03')];
    await wrap(<VisitsScreen />);
    expect(screen.getByText('Están juntos')).toBeTruthy();
  });

  it('sugiere apuntar una cuenta regresiva que ya pasó', async () => {
    mockVisits = [visit('a', '2026-09-01', '2026-09-03')];
    mockEvents = [{ id: 'e1', kind: 'visit', date: '2026-10-12', title: 'Nos vemos' }];
    await wrap(<VisitsScreen />);
    expect(screen.getByText('¿Ya se vieron el 12 de oct?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Apuntarla' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/visits/edit', params: { eventId: 'e1' } });
  });
});

describe('VisitEditor', () => {
  it('guarda una visita de un solo día con hoy por defecto', async () => {
    await wrap(<VisitEditor />);
    await fireEvent.press(screen.getByRole('button', { name: 'Apuntar visita' }));
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave.mock.calls[0][0]).toMatchObject({
      startDate: '2026-10-31',
      endDate: '2026-10-31',
      eventId: null,
    });
  });

  it('avisa si se enciman con otra visita y no guarda', async () => {
    mockVisits = [visit('a', '2026-10-31', '2026-10-31')];
    await wrap(<VisitEditor />);
    await fireEvent.press(screen.getByRole('button', { name: 'Apuntar visita' }));
    expect(mockSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Se enciman con la visita del 31 oct 2026/)).toBeTruthy();
  });

  it('editando una que no existe: hoja ya no está', async () => {
    await wrap(<VisitEditor id="zzz" />);
    expect(screen.getByText('Esa hoja ya no está')).toBeTruthy();
  });
});

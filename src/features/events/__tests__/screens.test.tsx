import { fireEvent, render, screen } from '@testing-library/react-native';

import { ToastProvider } from '@/components/Toast';
import type { Countdown } from '@/lib/events';
import { ThemeProvider } from '@/theme';

import type { EventRow } from '../api';
import { CountdownsScreen } from '../components/CountdownsScreen';
import { EventEditor } from '../components/EventEditor';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
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
  useCouple: () => ({ couple: { id: 'c1' } }),
  useToday: () => ({ today: '2026-10-31', timeZone: 'America/Mexico_City' }),
}));

const countdown = (extra: Partial<Countdown>): Countdown => ({
  key: 'auto:anniversary',
  kind: 'anniversary',
  title: 'Aniversario',
  emoji: null,
  date: '2027-02-14',
  daysUntil: 106,
  eventId: null,
  recurring: true,
  ...extra,
});

const visit = countdown({
  key: 'event:v',
  kind: 'visit',
  title: 'Nos vemos en Guadalajara',
  emoji: '✈️',
  date: '2026-11-10',
  daysUntil: 10,
  eventId: 'v',
  recurring: false,
});

let mockData = {
  countdowns: [] as Countdown[],
  visit: null as Countdown | null,
  past: [] as EventRow[],
  today: '2026-10-31',
  isLoading: false,
  isError: false,
  isRefetching: false,
  refetch: jest.fn(),
};
let mockEvents: EventRow[] = [];
const mockSave = jest.fn();
const mockRemove = jest.fn();
jest.mock('../hooks', () => ({
  useCountdowns: () => mockData,
  useEvents: () => ({
    events: mockEvents,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useSaveEvent: () => ({ mutate: mockSave, isPending: false }),
  useDeleteEvent: () => ({ mutate: mockRemove, isPending: false }),
  useEventsRealtime: jest.fn(),
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockEvents = [];
  mockData = {
    countdowns: [],
    visit: null,
    past: [],
    today: '2026-10-31',
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  };
});

describe('Cuentas regresivas', () => {
  it('con visita: la destaca y lista lo que viene con su nota', async () => {
    mockData.visit = visit;
    mockData.countdowns = [visit, countdown({})];
    await wrap(<CountdownsScreen />);
    expect(screen.getByText('La próxima vez que nos vemos')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getAllByText('✈️ Nos vemos en Guadalajara').length).toBeGreaterThan(0);
    expect(screen.getByText('Sale de su aniversario')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/^La próxima vez que nos vemos: /));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/events/edit', params: { id: 'v' } });
  });

  it('sin visita: invita a apuntarla', async () => {
    await wrap(<CountdownsScreen />);
    expect(screen.getByText('¿Cuándo se vuelven a ver?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Apuntar la próxima visita' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/events/edit', params: { kind: 'visit' } });
  });

  it('error: permite reintentar', async () => {
    mockData.isError = true;
    await wrap(<CountdownsScreen />);
    expect(screen.getByText('No pudimos abrir las cuentas regresivas')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockData.refetch).toHaveBeenCalled();
  });

  it('muestra "Ya pasaron" cuando hay eventos pasados', async () => {
    mockData.past = [
      {
        id: 'p',
        couple_id: 'c1',
        created_by: 'u1',
        kind: 'custom',
        title: 'Concierto',
        emoji: null,
        date: '2026-10-21',
        recurring_yearly: false,
        note: null,
        created_at: '',
        updated_at: '',
      },
    ];
    await wrap(<CountdownsScreen />);
    expect(screen.getByText('Ya pasaron')).toBeTruthy();
    expect(screen.getByText('hace 10 días')).toBeTruthy();
  });
});

describe('EventEditor', () => {
  it('con ?kind=visit precarga la visita y esconde "se repite"', async () => {
    await wrap(<EventEditor kind="visit" />);
    expect(screen.getByText('Apuntar la próxima visita')).toBeTruthy();
    expect(screen.queryByLabelText('Se repite cada año')).toBeNull();
  });

  it('valida el título antes de guardar', async () => {
    await wrap(<EventEditor />);
    await fireEvent.press(screen.getByRole('button', { name: 'Apuntar' }));
    expect(screen.getByText('Ponle un nombre a esa fecha.')).toBeTruthy();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('guarda una fecha propia que se repite', async () => {
    await wrap(<EventEditor />);
    await fireEvent.changeText(screen.getByLabelText('¿Qué es?'), 'Nuestro cumple');
    await fireEvent(screen.getByLabelText('Se repite cada año'), 'valueChange', true);
    await fireEvent.press(screen.getByRole('button', { name: 'Apuntar' }));
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Nuestro cumple',
        kind: 'custom',
        date: '2026-10-31',
        recurringYearly: true,
      }),
      expect.anything(),
    );
  });

  it('al editar carga el evento y ofrece arrancarlo', async () => {
    mockEvents = [
      {
        id: 'e1',
        couple_id: 'c1',
        created_by: 'u1',
        kind: 'custom',
        title: 'Viaje',
        emoji: '🏖️',
        date: '2027-01-05',
        recurring_yearly: false,
        note: null,
        created_at: '',
        updated_at: '',
      },
    ];
    await wrap(<EventEditor id="e1" />);
    expect(screen.getByDisplayValue('Viaje')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Arrancar esta hoja' })).toBeTruthy();
  });
});

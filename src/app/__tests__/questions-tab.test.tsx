import { fireEvent, render, screen } from '@testing-library/react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Streak } from '@/lib/questions';
import { ThemeProvider } from '@/theme';

import QuestionsScreen from '../(tabs)/questions';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/components/Toast', () => ({
  ...jest.requireActual('@/components/Toast'),
  useToast: () => ({ show: jest.fn() }),
}));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    me: { id: 'u1', display_name: 'Ale', nickname: null },
    partner: { id: 'u2', display_name: 'Caleb', nickname: null },
    members: [
      { user_id: 'u1', spicy_opt_in: false },
      { user_id: 'u2', spicy_opt_in: false },
    ],
  }),
  useToday: () => ({ today: '2026-11-04', timeZone: 'America/Mexico_City' }),
}));

const baseStreak: Streak = {
  current: 12,
  best: 20,
  today: '2026-11-04',
  today_done: false,
  today_is_repair: false,
  repair_day: '2026-11-03',
  repairs_used: 2,
  repairs_left: 3,
  repairs_per_month: 5,
  missing_days: ['2026-11-03'],
};
let mockStreak: Streak = baseStreak;

jest.mock('@/features/questions', () => ({
  DailyQuestionCard: () => null,
  useStreak: () => ({
    streak: mockStreak,
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
  useCategories: () => ({
    categories: [],
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/features/games', () => ({
  GamesSection: () => {
    const { Text } = jest.requireActual('react-native');
    return <Text>Contenido de juegos</Text>;
  },
  useGameOverview: () => ({ isRefetching: false, refetch: jest.fn() }),
}));

const renderScreen = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 412, height: 915 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ThemeProvider>
        <QuestionsScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );

describe('Pestaña Preguntas', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockStreak = baseStreak;
  });

  it('tiene las secciones Preguntas y Juegos, sin el grupo viejo', async () => {
    await renderScreen();
    expect(screen.getByRole('header', { name: 'Preguntas' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Juegos' })).toBeTruthy();
    expect(screen.getByText('Contenido de juegos')).toBeTruthy();
    expect(screen.queryByText('Más para jugar y recordar')).toBeNull();
    expect(screen.queryByText('Historial')).toBeNull();
  });

  it('ofrece recuperar ayer con el cupo que queda', async () => {
    await renderScreen();
    expect(screen.getByText(/Se les pasó ayer/)).toBeTruthy();
    expect(screen.getByText('Les quedan 3 de 5 recuperaciones este mes')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Recuperar ayer' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/question',
      params: { day: '2026-11-03' },
    });
  });

  it('sin cupo no muestra nada de recuperación', async () => {
    mockStreak = { ...baseStreak, repairs_left: 0 };
    await renderScreen();
    expect(screen.queryByText(/Se les pasó ayer/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Recuperar ayer' })).toBeNull();
  });

  it('si hoy recuperaron ayer, lo avisa', async () => {
    mockStreak = { ...baseStreak, today_is_repair: true, repair_day: null, missing_days: [] };
    await renderScreen();
    expect(screen.getByText('Hoy recuperaron ayer; hoy no suma a la racha.')).toBeTruthy();
  });
});

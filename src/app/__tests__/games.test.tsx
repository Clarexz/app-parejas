import { fireEvent, render, screen } from '@testing-library/react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/theme';

import GameScreen from '../game/[id]';
import GamesScreen from '../games/index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'r1' }),
}));
jest.mock('@/components/Toast', () => ({
  ...jest.requireActual('@/components/Toast'),
  useToast: () => ({ show: jest.fn() }),
}));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    couple: { id: 'c1', timezone: 'America/Mexico_City' },
    me: { id: 'u1', display_name: 'Ale', nickname: null },
    partner: { id: 'u2', display_name: 'Caleb', nickname: null },
    members: [
      { user_id: 'u1', spicy_opt_in: false },
      { user_id: 'u2', spicy_opt_in: false },
    ],
  }),
  useToday: () => ({ today: '2026-10-30', timeZone: 'America/Mexico_City' }),
}));

const mockAnswer = jest.fn();
const mockStart = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const overview = {
  games: [
    {
      game: 'wyr',
      open_round: {
        id: 'r1',
        spicy: false,
        created_by: 'u2',
        created_at: '',
        my_count: 3,
        partner_count: 7,
        total: 10,
      },
      finished_count: 0,
      avg_pct: null,
      last_pct: null,
    },
    { game: 'nhie', open_round: null, finished_count: 0, avg_pct: null, last_pct: null },
    { game: 'most_likely', open_round: null, finished_count: 0, avg_pct: null, last_pct: null },
    { game: 'agree', open_round: null, finished_count: 0, avg_pct: null, last_pct: null },
  ],
  recent: [],
  drawings: { active: [], recent: [] },
};
let mockRound: unknown;
const round = {
  id: 'r1',
  game: 'wyr',
  spicy: false,
  status: 'playing',
  created_by: 'u2',
  created_at: '',
  finished_at: null,
  total: 10,
  my_count: 3,
  partner_count: 7,
  items: [
    {
      id: 'q1',
      position: 0,
      text: '¿Prefieres tacos o pizza?',
      options: ['Tacos', 'Pizza'],
      intensity: 'ligera',
    },
  ],
  mine: {},
  partner: null,
  match: null,
};
mockRound = round;
jest.mock('@/features/stories/components/DrawingPad', () => ({ DrawingPad: () => null }));
jest.mock('@/features/stories/components/StoryFrame', () => ({ StrokesSvg: () => null }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/games/hooks', () => ({
  useGameOverview: () => ({
    overview,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    isRefetching: false,
  }),
  useGameRound: () => ({
    round: mockRound,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    isRefetching: false,
  }),
  useStartGameRound: () => ({ mutate: mockStart, isPending: false }),
  useStartDrawing: () => ({ mutate: jest.fn(), isPending: false }),
  useAnswerGameItem: () => ({ mutate: mockAnswer, isPending: false }),
  useDeleteGameRound: () => ({ mutate: jest.fn(), isPending: false }),
}));

describe('Juegos', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockAnswer.mockClear();
    mockStart.mockClear();
    mockRound = round;
  });

  it('el hub muestra el turno pendiente y abre la ronda', async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 400, height: 800 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <ThemeProvider>
          <GamesScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByText('Te toca')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Te toca en ¿Qué prefieres?'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/game/[id]', params: { id: 'r1' } });
  });

  it('la ronda muestra el ítem y manda la respuesta elegida', async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 400, height: 800 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <ThemeProvider>
          <GameScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByText('¿Prefieres tacos o pizza?')).toBeTruthy();
    expect(screen.getByText('4 de 10')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Pizza'));
    expect(mockAnswer).toHaveBeenCalledWith({ questionId: 'q1', choice: 1 }, expect.any(Object));
  });
  const shell = (ui: React.ReactElement) => (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ThemeProvider>{ui}</ThemeProvider>
    </SafeAreaProvider>
  );

  it('al empezar una ronda ofrece 10, 15 y 20 (10 por defecto) y manda el elegido', async () => {
    await render(shell(<GamesScreen />));
    await fireEvent.press(screen.getByLabelText(/^Yo nunca\./));
    expect(screen.getByRole('tab', { name: '10' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '20' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Jugar' }));
    expect(mockStart).toHaveBeenLastCalledWith(
      { game: 'nhie', spicy: false, size: 10 },
      expect.any(Object),
    );
    await fireEvent.press(screen.getByRole('tab', { name: '15' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Jugar' }));
    expect(mockStart).toHaveBeenLastCalledWith(
      { game: 'nhie', spicy: false, size: 15 },
      expect.any(Object),
    );
  });

  it('el avance sale del tamaño real de la ronda', async () => {
    mockRound = { ...round, total: 15, my_count: 3 };
    await render(shell(<GameScreen />));
    expect(screen.getByText('4 de 15')).toBeTruthy();
  });

  it('el resultado de una ronda de 15 usa el tamaño real y "Otra ronda" repite el tamaño', async () => {
    mockRound = {
      ...round,
      status: 'finished',
      finished_at: '2026-10-30T10:00:00Z',
      total: 15,
      my_count: 15,
      partner_count: 15,
      mine: { q1: 0 },
      partner: { q1: 0 },
      match: { matches: 9, total: 15, pct: 60 },
    };
    await render(shell(<GameScreen />));
    expect(screen.getByText('60%')).toBeTruthy();
    expect(screen.getByText('Coincidieron en 9 de 15.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Otra ronda' }));
    expect(mockStart).toHaveBeenLastCalledWith(
      { game: 'wyr', spicy: false, size: 15 },
      expect.any(Object),
    );
  });
});

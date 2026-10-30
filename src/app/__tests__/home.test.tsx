import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';

import HomeScreen from '../(tabs)/index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, navigate: jest.fn() }),
}));

let mockAnniversary: string | null = null;
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    couple: { id: 'c1', anniversary_date: mockAnniversary, timezone: 'America/Mexico_City' },
    me: { id: 'u1', display_name: 'Ale', nickname: null, avatar_path: null },
    partner: { id: 'u2', display_name: 'Caleb', nickname: null, avatar_path: null },
    refetch: jest.fn(),
  }),
  useToday: () => ({ today: '2026-10-30', timeZone: 'America/Mexico_City' }),
}));
jest.mock('@/features/profile', () => ({ useSignedUrl: () => null }));
jest.mock('@/features/mood', () => ({
  useMoods: () => ({
    moods: [],
    latestByUser: {
      u2: { id: 'm1', user_id: 'u2', emoji: '😴', note: 'Sin café', created_at: '' },
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useMoodRealtime: jest.fn(),
  MoodSheet: () => null,
}));

const renderScreen = () =>
  render(
    <ThemeProvider>
      <HomeScreen />
    </ThemeProvider>,
  );

describe('HomeScreen', () => {
  beforeEach(() => mockPush.mockClear());

  it('sin aniversario invita a poner la fecha', async () => {
    mockAnniversary = null;
    await renderScreen();
    expect(screen.getByText('¿Desde cuándo son ustedes?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Poner nuestra fecha' }));
    expect(mockPush).toHaveBeenCalledWith('/settings/couple');
  });

  it('con aniversario muestra los días juntos y lo que viene', async () => {
    mockAnniversary = '2023-02-14';
    await renderScreen();
    expect(screen.getByText('1,355')).toBeTruthy();
    expect(
      screen.getByText('3 años, 8 meses y 16 días desde el 14 de febrero de 2023'),
    ).toBeTruthy();
    expect(screen.getByText('Lo que viene')).toBeTruthy();
  });

  it('muestra el mood y la nota de la pareja, y avisa si no hay mood', async () => {
    mockAnniversary = '2023-02-14';
    await renderScreen();
    expect(screen.getByText('Sin café')).toBeTruthy();
    expect(screen.getByLabelText('Ale')).toBeTruthy();
    expect(screen.getByLabelText('Ale').props.accessibilityHint).toBe('Toca para cambiar tu mood');
  });
});

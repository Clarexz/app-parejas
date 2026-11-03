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
  useFruits: () => {
    const { FRUITS } = jest.requireActual('@/lib/fruits');
    return { me: FRUITS.mango, partner: FRUITS.sandia };
  },
}));
jest.mock('@/features/profile', () => ({ useSignedUrl: () => null }));
jest.mock('@/features/mood', () => ({
  useMoods: () => ({
    moods: [],
    latestByUser: {
      u2: {
        id: 'm1',
        user_id: 'u2',
        emoji: '😴',
        note: 'Sin café',
        created_at: new Date().toISOString(),
      },
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useMoodRealtime: jest.fn(),
  MoodSheet: () => null,
}));
jest.mock('@/features/notifications', () => ({
  usePushSoftAsk: () => ({ visible: false, accept: jest.fn(), dismiss: jest.fn() }),
}));
jest.mock('@/features/stories', () => ({
  useActiveStories: () => ({ stories: [], refetch: jest.fn() }),
  groupActive: () => ({ mine: [], partner: [{ id: 's1' }], partnerUnseen: 1 }),
}));

jest.mock('@/features/events', () => ({
  EventsEvents: () => null,
  useCountdowns: () => {
    const { autoCountdowns } = jest.requireActual('@/lib/events');
    return {
      events: [],
      today: '2026-10-30',
      isLoading: false,
      featured: null,
      countdowns: mockAnniversary
        ? autoCountdowns({
            anniversary: mockAnniversary,
            me: null,
            partner: null,
            today: '2026-10-30',
          })
        : [],
      refetch: jest.fn(),
    };
  },
}));
jest.mock('@/features/memories', () => ({ OnThisDayCard: () => null }));
jest.mock('@/features/questions', () => ({
  useDailyQuestion: () => ({
    card: {
      question: { text: '¿Qué extrañas más?' },
      mine: null,
      partner_answered: true,
      comment_count: 0,
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useStreak: () => ({
    streak: { current: 7, best: 9, today: '2026-10-30', today_done: false, missing_days: [] },
  }),
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

  it('con aniversario muestra los días juntos y su desglose al tocar', async () => {
    mockAnniversary = '2023-02-14';
    await renderScreen();
    expect(screen.getByText('1,355')).toBeTruthy();
    expect(screen.queryByText(/desde el 14 de febrero de 2023/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '1,355 días juntos' }));
    expect(
      screen.getByText('3 años, 8 meses y 16 días desde el 14 de febrero de 2023'),
    ).toBeTruthy();
  });

  it('muestra la fecha corta, la pregunta con su estado y la racha', async () => {
    mockAnniversary = '2023-02-14';
    await renderScreen();
    expect(screen.getByText('viernes 30 oct')).toBeTruthy();
    expect(screen.getByText('¿Qué extrañas más?')).toBeTruthy();
    expect(screen.getByText('Ya contestó. Ahora tú.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Contestar' }));
    expect(mockPush).toHaveBeenCalledWith('/question');
    expect(screen.getByRole('button', { name: '7 días de racha' })).toBeTruthy();
  });

  it('sin cuenta regresiva invita a apuntar la próxima vez', async () => {
    mockAnniversary = null;
    await renderScreen();
    expect(screen.getByText('¿Cuándo se ven?')).toBeTruthy();
  });

  it('muestra el mood de tu pareja y la story nueva abre el visor', async () => {
    mockAnniversary = '2023-02-14';
    await renderScreen();
    expect(screen.getByLabelText('Caleb, Con sueño: Sin café')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Story nueva de Caleb' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/story/view',
      params: { user: 'u2' },
    });
  });

  it('tu burbuja vacía abre el selector y tu foto, las stories', async () => {
    mockAnniversary = '2023-02-14';
    await renderScreen();
    expect(screen.getByLabelText('¿Y tú? Toca para elegir tu mood')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sube una story' }));
    expect(mockPush).toHaveBeenCalledWith('/stories');
  });
});

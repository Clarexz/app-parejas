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
let mockDistanceKind = 'none';
jest.mock('@/features/distance', () => ({
  isLocationSupported: () => true,
  useDistance: () => ({
    kind: mockDistanceKind,
    km: null,
    kmText: null,
    route: null,
    myCity: null,
    partnerCity: null,
    partnerAgo: null,
    phrase: null,
    partnerName: 'Caleb',
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  DistanceCardView: ({ onPress }: { onPress: () => void }) => {
    const { Pressable, Text } = jest.requireActual('react-native');
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>Distancia en Inicio</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
let mockLists: unknown[] = [];
jest.mock('@/features/lists', () => ({
  useLists: () => ({ lists: mockLists, refetch: jest.fn() }),
  useListsRealtime: jest.fn(),
  HomeListsCard: jest.requireActual('@/features/lists/components/HomeListsCard').HomeListsCard,
}));
let mockLoveOverview: unknown = null;
jest.mock('@/features/love-languages', () => ({
  useLoveLanguages: () => ({ overview: mockLoveOverview, refetch: jest.fn() }),
  HomeLoveLanguagesCard: jest.requireActual(
    '@/features/love-languages/components/HomeLoveLanguagesCard',
  ).HomeLoveLanguagesCard,
}));
jest.mock('@/features/memories', () => ({ OnThisDayCard: () => null }));
jest.mock('@/features/updates', () => ({ UpdateNotice: () => null }));
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
  beforeEach(() => {
    mockPush.mockClear();
    mockDistanceKind = 'none';
    mockLists = [];
    mockLoveOverview = null;
  });

  it('sin aniversario invita a poner la fecha', async () => {
    mockAnniversary = null;
    await renderScreen();
    expect(screen.getByText('¿Desde cuándo son ustedes?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Poner nuestra fecha' }));
    expect(mockPush).toHaveBeenCalledWith('/settings/couple');
  });

  it('con aniversario muestra los días juntos y el desglose fijo al final', async () => {
    mockAnniversary = '2023-02-14';
    await renderScreen();
    expect(screen.getByText('1,355')).toBeTruthy();
    expect(screen.getByText('Tiempo juntos')).toBeTruthy();
    expect(screen.getByText('3 años, 8 meses y 16 días')).toBeTruthy();
    expect(screen.getByText('desde el 14 de febrero de 2023')).toBeTruthy();
    expect(screen.queryByText(/Les faltan/)).toBeNull();
  });

  it('sin aniversario no hay tarjeta de tiempo juntos', async () => {
    mockAnniversary = null;
    await renderScreen();
    expect(screen.queryByText('Tiempo juntos')).toBeNull();
  });

  it('listas: hasta tres con avance, abre una y "Ver todas"', async () => {
    mockAnniversary = null;
    mockLists = [1, 2, 3, 4].map((n) => ({
      id: `l${n}`,
      title: `Lista ${n}`,
      kind: 'other',
      emoji: null,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: `2026-10-0${n}T00:00:00Z`,
      itemCount: 8,
      doneCount: 3,
    }));
    await renderScreen();
    expect(screen.queryByText('Lista 1')).toBeNull();
    expect(screen.getAllByText('3 de 8')).toHaveLength(3);
    await fireEvent.press(screen.getByRole('button', { name: /Lista 4/ }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/lists/[id]', params: { id: 'l4' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Ver todas (4)' }));
    expect(mockPush).toHaveBeenCalledWith('/lists');
  });

  it('sin listas invita a crear una', async () => {
    mockAnniversary = null;
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Crear una lista' }));
    expect(mockPush).toHaveBeenCalledWith('/lists');
  });

  it('lenguaje del amor: invita sin test y muestra a los dos con test', async () => {
    mockAnniversary = null;
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Descubran su lenguaje del amor' }));
    expect(mockPush).toHaveBeenCalledWith('/love-languages');
  });

  it('lenguaje del amor con resultados', async () => {
    mockAnniversary = null;
    const r = (scores: Record<string, number>) => ({
      user_id: 'x',
      quiz_version: 1,
      answers: [],
      scores: { words: 0, time: 0, gifts: 0, acts: 0, touch: 0, ...scores },
      created_at: '',
      updated_at: '',
    });
    mockLoveOverview = { mine: r({ time: 12 }), partner: r({ words: 9 }), partnerDone: true };
    await renderScreen();
    expect(screen.getByText('Tiempo de calidad')).toBeTruthy();
    expect(screen.getByText('Palabras de afirmación')).toBeTruthy();
  });

  it('la distancia de Inicio lleva a /distance', async () => {
    mockAnniversary = null;
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Distancia en Inicio' }));
    expect(mockPush).toHaveBeenCalledWith('/distance');
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

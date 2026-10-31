import 'react-native-gesture-handler/jestSetup';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '@/components/Toast';
import { ThemeProvider, lightColors } from '@/theme';

import StoriesScreen from '../../../app/(tabs)/stories';
import { StoryViewer } from '../components/StoryViewer';

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
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    couple: { id: 'c1', timezone: 'America/Mexico_City' },
    me: { id: 'u1', display_name: 'Ale', nickname: null, avatar_path: null },
    partner: { id: 'u2', display_name: 'Caleb', nickname: null, avatar_path: null },
  }),
  useToday: () => ({ today: '2026-10-30', timeZone: 'America/Mexico_City' }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/profile', () => ({ useSignedUrl: () => null }));

const iso = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
const row = (id: string, userId: string, extra: Record<string, unknown> = {}) => ({
  id,
  couple_id: 'c1',
  user_id: userId,
  kind: 'text',
  media_path: null,
  thumb_path: null,
  text: 'Hay café',
  bg: 'postit',
  font: 'hand',
  strokes: null,
  stickers: [],
  created_at: iso(2),
  expires_at: new Date(Date.parse(iso(2)) + 24 * 3_600_000).toISOString(),
  deleted_at: null,
  views: [],
  reactions: [],
  replies: [],
  ...extra,
});

let mockStories: ReturnType<typeof row>[] = [];
const mockReact = jest.fn();
const mockReply = jest.fn();
const mockMarkSeen = jest.fn();
jest.mock('../hooks', () => ({
  useActiveStories: () => ({
    stories: mockStories,
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
  useStory: () => ({ story: null, isLoading: false, isError: false, refetch: jest.fn() }),
  useStoryMediaUrl: () => ({ url: null, isLoading: false, isError: false }),
  useMarkStorySeen: () => ({ mutate: mockMarkSeen }),
  useReactToStory: () => ({ mutate: mockReact }),
  useReplyToStory: () => ({ mutate: mockReply }),
  useSaveStoryToGallery: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteStory: () => ({ mutate: jest.fn() }),
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <GestureHandlerRootView>
      <ThemeProvider>
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockStories = [];
});

describe('pestaña Stories', () => {
  it('sin stories de tu pareja se lo dice con humor', async () => {
    await wrap(<StoriesScreen />);
    expect(screen.getByText('Caleb no ha pegado nada hoy. Pégale tú una primero.')).toBeTruthy();
    expect(screen.getByText('Todavía no pegas nada hoy.')).toBeTruthy();
  });

  it('con la story de tu pareja sin ver la marca como NUEVA y abre el visor', async () => {
    mockStories = [row('s1', 'u2')];
    await wrap(<StoriesScreen />);
    expect(screen.getByText('NUEVA')).toBeTruthy();
    expect(screen.getByText(/Caleb · hace 2 h · quedan (21|22) h/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Story de Caleb, nueva' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/story/view', params: { user: 'u2' } });
  });

  it('muestra quién vio las tuyas', async () => {
    mockStories = [
      row('s2', 'u1', { views: [{ user_id: 'u2', seen_at: iso(1) }] }),
      row('s3', 'u1'),
    ];
    await wrap(<StoriesScreen />);
    expect(screen.getByText('Visto')).toBeTruthy();
    expect(screen.getByText('Sin ver')).toBeTruthy();
  });

  it('"Pegar una story" abre las opciones y manda a crear', async () => {
    await wrap(<StoriesScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pegar una story' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Dibujar' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/story/new',
      params: { kind: 'drawing' },
    });
  });
});

describe('visor de stories', () => {
  it('marca como vista la de tu pareja y manda reacción y respuesta', async () => {
    mockStories = [row('s1', 'u2', { reactions: [{ user_id: 'u1', emoji: '😍' }] })];
    await wrap(<StoryViewer userId="u2" />);
    expect(mockMarkSeen).toHaveBeenCalledWith('s1');

    // Tocar otra reacción la manda; tocar la elegida la quita.
    await fireEvent.press(screen.getByRole('radio', { name: 'Reaccionar con 😂' }));
    expect(mockReact).toHaveBeenCalledWith({ id: 's1', emoji: '😂' }, expect.anything());
    await fireEvent.press(screen.getByRole('radio', { name: 'Reaccionar con 😍' }));
    expect(mockReact).toHaveBeenCalledWith({ id: 's1', emoji: null }, expect.anything());

    await fireEvent.changeText(screen.getByLabelText('Respóndele a Caleb'), 'Qué rico se ve');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar respuesta' }));
    expect(mockReply).toHaveBeenCalledWith({ id: 's1', body: 'Qué rico se ve' }, expect.anything());
  });

  it('en una story tuya dice si ya la vio y no deja reaccionar', async () => {
    mockStories = [
      row('s2', 'u1', {
        views: [{ user_id: 'u2', seen_at: iso(1) }],
        replies: [
          {
            id: 'r1',
            story_id: 's2',
            couple_id: 'c1',
            user_id: 'u2',
            body: 'Jaja',
            created_at: iso(1),
          },
        ],
      }),
    ];
    await wrap(<StoryViewer userId="u1" />);
    expect(screen.getByText(/Visto por Caleb/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Respuestas (1)' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Reaccionar con 😂' })).toBeNull();
    expect(mockMarkSeen).not.toHaveBeenCalled();
  });

  it('dibuja la story con el esquema del celular aunque el visor sea de noche', async () => {
    mockStories = [row('s4', 'u2', { kind: 'drawing', text: null, bg: 'paper', strokes: [] })];
    await wrap(<StoryViewer userId="u2" />);
    const frame = screen.getByLabelText('Story con un dibujo');
    expect(StyleSheet.flatten(frame.props.style).backgroundColor).toBe(lightColors.paper);
  });

  it('sin stories dice que ya se borró', async () => {
    await wrap(<StoryViewer userId="u2" />);
    expect(screen.getByText('Esta story ya se borró')).toBeTruthy();
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Pack } from '@/lib/packs';
import { ThemeProvider } from '@/theme';

import PackScreen from '../pack/[slug]';

const mockPush = jest.fn();
let mockPack: Pack | undefined;
let mockActive = false;
let mockQuestions: unknown[] = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ slug: 'pack-a' }),
  router: { back: jest.fn() },
}));
jest.mock('@/components/Toast', () => ({
  ...jest.requireActual('@/components/Toast'),
  useToast: () => ({ show: jest.fn() }),
}));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    me: { id: 'u1' },
    partner: { id: 'u2', display_name: 'Caleb', nickname: null },
    members: [
      { user_id: 'u1', spicy_opt_in: mockActive },
      { user_id: 'u2', spicy_opt_in: mockActive },
    ],
  }),
}));
jest.mock('@/features/questions', () => ({
  PackProgress: () => null,
  QuestionRow: ({ question, onPress }: { question: { text: string }; onPress: () => void }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text onPress={onPress}>{question.text}</Text>;
  },
  usePacks: () => ({
    packs: mockPack ? [mockPack] : [],
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
  useCategoryQuestions: () => ({
    questions: mockQuestions,
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
}));

const basePack: Pack = {
  slug: 'pack-a',
  name: 'Para conocernos',
  emoji: '🧩',
  description: 'Preguntas para empezar.',
  intensity: 'ligera',
  position: 1,
  total: 3,
  answered_by_me: 1,
  answered_by_both: 1,
  next_question_id: 'q2',
};

const renderScreen = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 412, height: 915 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ThemeProvider>
        <PackScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );

describe('Pantalla de un tema', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPack = basePack;
    mockActive = false;
    mockQuestions = [
      { id: 'q1', text: 'Primera', answered_by_me: true, answered_by_partner: false },
      { id: 'q2', text: 'Segunda', answered_by_me: false, answered_by_partner: false },
    ];
  });

  it('muestra descripción, avance y "Seguir" que abre la siguiente con el param pack', async () => {
    await renderScreen();
    expect(screen.getByText('Preguntas para empezar.')).toBeTruthy();
    expect(screen.getByText('1 de 3 contestadas por los dos')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Seguir' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/question',
      params: { id: 'q2', pack: 'pack-a' },
    });
  });

  it('sin avance dice "Empezar"', async () => {
    mockPack = { ...basePack, answered_by_me: 0, answered_by_both: 0 };
    await renderScreen();
    expect(screen.getByRole('button', { name: 'Empezar' })).toBeTruthy();
  });

  it('si ya contesté todas, lo dice y no hay botón', async () => {
    mockPack = { ...basePack, next_question_id: null, answered_by_me: 3 };
    await renderScreen();
    expect(screen.getByText('Ya contestaste todas.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Seguir' })).toBeNull();
  });

  it('abre una pregunta de la lista dentro del tema', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByText('Primera'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/question',
      params: { id: 'q1', pack: 'pack-a' },
    });
  });

  it('un tema picante sin picantes activas sale con candado y sin lista', async () => {
    mockPack = { ...basePack, intensity: 'picante' };
    await renderScreen();
    expect(screen.getByText('Todavía con candado')).toBeTruthy();
    expect(screen.queryByText('Primera')).toBeNull();
  });

  it('si el tema no existe, avisa', async () => {
    mockPack = undefined;
    await renderScreen();
    expect(screen.getByText('Ese tema ya no está')).toBeTruthy();
  });
});

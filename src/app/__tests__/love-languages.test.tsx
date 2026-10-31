import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/theme';

import quiz from '../../../content/love-languages.json';
import LoveLanguagesScreen from '../love-languages/index';
import QuizScreen from '../love-languages/quiz';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));
jest.mock('@/components/Toast', () => ({
  ...jest.requireActual('@/components/Toast'),
  useToast: () => ({ show: jest.fn() }),
}));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    me: { id: 'u1', display_name: 'Caleb', nickname: null },
    partner: { id: 'u2', display_name: 'Ale', nickname: null },
    members: [],
  }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const scores = (p: object) => ({ words: 0, time: 0, gifts: 0, acts: 0, touch: 0, ...p });
let mockOverview: unknown;
const mockSubmit = jest.fn();
jest.mock('@/features/love-languages/hooks', () => ({
  useLoveLanguages: () => ({
    overview: mockOverview,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    isRefetching: false,
  }),
  useSubmitLoveLanguageTest: () => ({ mutate: mockSubmit, isPending: false }),
}));

function wrap(node: React.ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ThemeProvider>{node}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('Lenguajes del amor', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSubmit.mockClear();
  });

  it('si la pareja ya lo hizo, invita sin revelar nada', async () => {
    mockOverview = { mine: null, partner: null, partnerDone: true };
    await wrap(<LoveLanguagesScreen />);
    expect(screen.getByText(/Ale ya lo hizo/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Hacer el test'));
    expect(mockPush).toHaveBeenCalledWith('/love-languages/quiz');
  });

  it('con los dos resultados muestra la comparación y cómo querer a la pareja', async () => {
    const base = { quiz_version: 1, answers: [], created_at: '', updated_at: '' };
    mockOverview = {
      mine: { ...base, user_id: 'u1', scores: scores({ time: 9, touch: 3 }) },
      partner: { ...base, user_id: 'u2', scores: scores({ time: 8, words: 4 }) },
      partnerDone: true,
    };
    await wrap(<LoveLanguagesScreen />);
    expect(screen.getByText('Los dos hablan Tiempo de calidad')).toBeTruthy();
    expect(screen.getByText('Cómo querer a Ale en su idioma')).toBeTruthy();
    expect(screen.getByText('Volver a hacer el test')).toBeTruthy();
  });

  it('el test avanza y manda las 30 respuestas', async () => {
    await wrap(<QuizScreen />);
    expect(screen.getByText('1 de 30')).toBeTruthy();
    for (const item of quiz.items) {
      await fireEvent.press(screen.getByLabelText(item.a.text));
    }
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const arg = mockSubmit.mock.calls[0][0];
    expect(arg.answers).toEqual(quiz.items.map((i) => i.a.language));
    expect(arg.quizVersion).toBe(1);
  });
});

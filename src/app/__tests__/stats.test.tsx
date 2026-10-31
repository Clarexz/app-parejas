import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { parseRelationshipStats } from '@/lib/stats';
import { ThemeProvider } from '@/theme';

import StatsRoute from '../stats';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    couple: { id: 'c1', anniversary_date: '2026-03-12', timezone: 'America/Mexico_City' },
    me: { id: 'u1', display_name: 'Caleb', nickname: null },
    partner: { id: 'u2', display_name: 'Ale', nickname: null },
    members: [],
  }),
}));

let mockStats: unknown;
jest.mock('@/features/stats/hooks', () => ({
  useRelationshipStats: () => ({
    stats: mockStats,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    isRefetching: false,
  }),
}));

let mockVisitCount = 0;
jest.mock('@/features/visits', () => ({
  useVisits: () => ({ visits: [], isLoading: false, isError: false, refetch: jest.fn() }),
  useVisitStats: () => ({
    count: mockVisitCount,
    daysTogether: mockVisitCount ? 12 : 0,
    daysApart: mockVisitCount ? 188 : 0,
    pctTogether: mockVisitCount ? 6 : null,
    longestVisit: mockVisitCount ? 8 : null,
    longestGap: null,
    averageGap: null,
    current: null,
    last: null,
    daysSinceLast: mockVisitCount ? 20 : null,
    today: '2026-10-31',
  }),
}));

let mockOverview: unknown;
jest.mock('@/features/love-languages', () => ({
  useLoveLanguages: () => ({
    overview: mockOverview,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const scores = (p: object) => ({ words: 0, time: 0, gifts: 0, acts: 0, touch: 0, ...p });

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

describe('Estadísticas', () => {
  beforeEach(() => mockPush.mockClear());

  it('con datos cuenta la relación en frases', async () => {
    mockVisitCount = 2;
    const base = { quiz_version: 1, answers: [], created_at: '', updated_at: '' };
    mockOverview = {
      mine: { ...base, user_id: 'u1', scores: scores({ time: 9 }) },
      partner: { ...base, user_id: 'u2', scores: scores({ touch: 8 }) },
      partnerDone: true,
    };
    mockStats = parseRelationshipStats({
      since: '2026-03-12',
      today: '2026-10-31',
      questions: {
        answered_me: 40,
        answered_partner: 38,
        answered_both: 35,
        daily_complete: 30,
        comments: 12,
      },
      streak: { current: 23, best: 40 },
      games: {
        rounds: 7,
        avg_pct: 72,
        best_pct: 100,
        by_game: [{ game: 'wyr', rounds: 7, avg_pct: 72 }],
      },
      drawings: { solved: 3, finished: 4 },
      memories: { total: 9, photos: 20, by_month: [{ month: '2026-10', count: 6 }] },
      visits: { count: 2, days: 12 },
      stories: 8,
      moods: 15,
    });
    await wrap(<StatsRoute />);
    expect(screen.getByText('DESDE 12 MAR 2026')).toBeTruthy();
    expect(screen.getByText('Estadísticas')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
    expect(screen.getByText('23 días seguidos contestando.')).toBeTruthy();
    expect(screen.getByText('Coinciden en el 72 % de los juegos')).toBeTruthy();
    expect(screen.getByText('Dibujos adivinados: 3 de 4.')).toBeTruthy();
    expect(screen.getByText('Su mejor mes fue octubre: 6 memorias.')).toBeTruthy();
    expect(screen.getByText('20 días sin verse')).toBeTruthy();
    expect(screen.getByText('Tú: Tiempo de calidad · Ale: Contacto físico')).toBeTruthy();
    expect(screen.getByText('8 stories y 15 moods compartidos')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Ver calendario')[0]);
    expect(mockPush).toHaveBeenCalledWith('/visits');
  });

  it('con ceros usa copy amable y deja ir al test', async () => {
    mockVisitCount = 0;
    mockOverview = { mine: null, partner: null, partnerDone: false };
    mockStats = parseRelationshipStats(null);
    await wrap(<StatsRoute />);
    expect(screen.getByText('Todavía no juegan ninguna ronda.')).toBeTruthy();
    expect(screen.getByText(/Todavía no pegan ninguna memoria/)).toBeTruthy();
    expect(screen.getByText(/Todavía no contestan ninguna pregunta/)).toBeTruthy();
    expect(screen.getByText('Todavía no apuntan ninguna visita en persona.')).toBeTruthy();
    expect(screen.getByText('Todavía no comparten stories ni moods.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Hacer el test'));
    expect(mockPush).toHaveBeenCalledWith('/love-languages');
  });
});

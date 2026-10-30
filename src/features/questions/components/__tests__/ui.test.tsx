import { fireEvent, render, screen } from '@testing-library/react-native';

import { ToastProvider } from '@/components';
import { ThemeProvider } from '@/theme';

import { HistoryCard } from '../HistoryCard';
import { SpicyOptIn } from '../SpicyOptIn';

const mockMutate = jest.fn();
let mockMembers: { user_id: string; spicy_opt_in: boolean }[] = [];

jest.mock('expo-haptics', () => ({}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    me: { id: 'me', display_name: 'Ale', nickname: null },
    partner: { id: 'p', display_name: 'Caleb', nickname: null },
    members: mockMembers,
  }),
}));
jest.mock('../../hooks', () => ({
  useSetSpicyOptIn: () => ({ mutate: mockMutate, isPending: false, variables: undefined }),
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>,
  );

const answer = (text: string) => ({
  id: 'a',
  user_id: 'u',
  text,
  choice: null,
  created_at: '',
  updated_at: '',
});
const base = {
  question: {
    id: 'q1',
    slug: 'q',
    category: 'amor',
    category_name: 'Amor',
    category_emoji: '',
    type: 'open' as const,
    text: '¿Qué te enamora?',
    options: null,
    intensity: 'ligera' as const,
  },
  day: '2026-10-28',
  comment_count: 0,
  last_activity: '2026-10-28T10:00:00Z',
};

describe('HistoryCard', () => {
  it('no muestra la respuesta de la pareja si no contesté', async () => {
    await wrap(
      <HistoryCard
        item={{ ...base, mine: null, partner: answer('Su secreto'), partner_answered: true }}
        partnerName="Caleb"
        timeZone="America/Mexico_City"
        onPress={() => {}}
      />,
    );
    expect(screen.queryByText('Su secreto')).toBeNull();
    expect(screen.getByText('Caleb contestó. Te toca para leerla.')).toBeTruthy();
  });

  it('muestra las dos respuestas si contesté', async () => {
    await wrap(
      <HistoryCard
        item={{
          ...base,
          mine: answer('Lo mío'),
          partner: answer('Lo suyo'),
          partner_answered: true,
        }}
        partnerName="Caleb"
        timeZone="America/Mexico_City"
        onPress={() => {}}
      />,
    );
    expect(screen.getByText('Lo mío')).toBeTruthy();
    expect(screen.getByText('Lo suyo')).toBeTruthy();
  });
});

describe('SpicyOptIn', () => {
  beforeEach(() => mockMutate.mockClear());

  it('solo mi pareja activó', async () => {
    mockMembers = [
      { user_id: 'me', spicy_opt_in: false },
      { user_id: 'p', spicy_opt_in: true },
    ];
    await wrap(<SpicyOptIn />);
    expect(screen.getByText('Caleb ya las activó.')).toBeTruthy();
    expect(screen.queryByText('Activas para los dos.')).toBeNull();
    await fireEvent.press(screen.getByRole('switch'));
    expect(mockMutate).toHaveBeenCalledWith(true, expect.anything());
  });

  it('activas para los dos', async () => {
    mockMembers = [
      { user_id: 'me', spicy_opt_in: true },
      { user_id: 'p', spicy_opt_in: true },
    ];
    await wrap(<SpicyOptIn />);
    expect(screen.getByText('Activas para los dos.')).toBeTruthy();
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('nadie las activó', async () => {
    mockMembers = [
      { user_id: 'me', spicy_opt_in: false },
      { user_id: 'p', spicy_opt_in: false },
    ];
    await wrap(<SpicyOptIn />);
    expect(screen.getByText('Caleb todavía no.')).toBeTruthy();
  });
});

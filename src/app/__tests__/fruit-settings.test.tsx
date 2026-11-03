import { fireEvent, render, screen } from '@testing-library/react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/theme';

import FruitSettingsScreen from '../settings/fruit';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  router: { back: jest.fn() },
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const mockPartner = { fruit: 'sandia', display_name: 'Caleb', nickname: null };
jest.mock('@/features/couple', () => {
  const { FRUITS } = jest.requireActual('@/lib/fruits');
  return {
    useCouple: () => ({ partner: mockPartner }),
    useFruits: () => ({ me: FRUITS.mango, partner: FRUITS.sandia }),
  };
});

const mockMutate = jest.fn();
jest.mock('@/features/profile', () => ({
  useSetFruit: () => ({ mutate: mockMutate, isPending: false, isError: false, error: null }),
}));

const renderScreen = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 412, height: 915 },
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
      }}
    >
      <ThemeProvider>
        <FruitSettingsScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );

describe('FruitSettingsScreen', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockBack.mockClear();
  });

  it('parte de tu fruta y guarda la elegida', async () => {
    await renderScreen();
    expect(screen.getByText('Quedarme con Mango')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Uva' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Quedarme con Uva' }));
    expect(mockMutate).toHaveBeenCalledWith('uva', expect.any(Object));
  });

  it('bloquea la fruta que eligió tu pareja', async () => {
    await renderScreen();
    expect(screen.getByRole('radio', { name: 'Sandía, bloqueada: es de Caleb' })).toBeTruthy();
  });

  it('regresa al guardar', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Quedarme con Mango' }));
    const opts = mockMutate.mock.calls[0][1] as { onSuccess: () => void };
    opts.onSuccess();
    expect(mockBack).toHaveBeenCalled();
  });
});

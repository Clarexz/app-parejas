import { fireEvent, render, screen } from '@testing-library/react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components';
import { ThemeProvider } from '@/theme';

import NotificationSettingsScreen from '../settings/notifications';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({ partner: { display_name: 'Caleb', nickname: null } }),
}));

const mockUpdate = jest.fn();
const mockRequest = jest.fn();
const mockTest = jest.fn();
let mockStatus = 'undetermined';
let mockLoading = false;
let mockPrefs = {
  answers: true,
  comments: true,
  moods: true,
  nudges: true,
  stories: true,
  reminderEnabled: true,
  reminderTime: '21:00',
};

jest.mock('@/features/notifications', () => ({
  useNotificationPrefs: () => ({
    prefs: mockPrefs,
    isLoading: mockLoading,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateNotificationPrefs: () => ({ mutate: mockUpdate }),
  usePushPermission: () => ({
    status: mockStatus,
    canAskAgain: true,
    request: mockRequest,
    openSettings: jest.fn(),
    refresh: jest.fn(),
  }),
  useSendTestNotification: () => ({ mutate: mockTest, isPending: false }),
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
        <ToastProvider>
          <NotificationSettingsScreen />
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );

describe('NotificationSettingsScreen', () => {
  beforeEach(() => {
    mockUpdate.mockClear();
    mockRequest.mockClear();
    mockStatus = 'undetermined';
    mockLoading = false;
  });

  it('muestra los avisos con el nombre de la pareja', async () => {
    await renderScreen();
    expect(screen.getByText('Cuando Caleb contesta')).toBeTruthy();
    expect(screen.getByText('Recordatorio diario')).toBeTruthy();
    expect(screen.getByText('9:00 p. m.')).toBeTruthy();
  });

  it('un toggle guarda el cambio', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole('switch', { name: 'Cuando Caleb contesta' }));
    expect(mockUpdate).toHaveBeenCalledWith({ answers: false }, expect.any(Object));
  });

  it('el aviso de stories se puede apagar', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole('switch', { name: 'Stories nuevas y respuestas' }));
    expect(mockUpdate).toHaveBeenCalledWith({ stories: false }, expect.any(Object));
  });

  it('cambia la hora del recordatorio', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Una hora más' }));
    expect(mockUpdate).toHaveBeenCalledWith({ reminderTime: '22:00' }, expect.any(Object));
    await fireEvent.press(screen.getByRole('button', { name: '15 minutos más' }));
    expect(mockUpdate).toHaveBeenCalledWith({ reminderTime: '21:15' }, expect.any(Object));
  });

  it('sin permiso invita a activarlo y la prueba está deshabilitada', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Activar avisos' }));
    expect(mockRequest).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Mandarme una de prueba' }));
    expect(mockTest).not.toHaveBeenCalled();
  });

  it('con permiso manda la de prueba', async () => {
    mockStatus = 'granted';
    await renderScreen();
    expect(screen.getByText('Los avisos están activos en este celular.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Mandarme una de prueba' }));
    expect(mockTest).toHaveBeenCalled();
  });

  it('mientras carga no muestra los ajustes', async () => {
    mockLoading = true;
    await renderScreen();
    expect(screen.queryByText('Qué te avisamos')).toBeNull();
  });
});

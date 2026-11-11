import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorFallback } from '../ErrorFallback';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

describe('ErrorFallback', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => spy.mockRestore());

  it('muestra el aviso, registra el error y ofrece las dos salidas', async () => {
    const onRetry = jest.fn();
    const onGoHome = jest.fn();
    const error = new Error('boom');
    await render(<ErrorFallback error={error} onRetry={onRetry} onGoHome={onGoHome} />);

    expect(screen.getByText('Algo se rompió')).toBeTruthy();
    expect(spy).toHaveBeenCalledWith('Error de pantalla:', error);

    await fireEvent.press(screen.getByText('Volver a intentar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByText('Ir a Inicio'));
    expect(onGoHome).toHaveBeenCalledTimes(1);
  });
});

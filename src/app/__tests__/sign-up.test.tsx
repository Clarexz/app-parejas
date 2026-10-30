import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';

import SignUpScreen from '../(auth)/sign-up';

const mockMutate = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
jest.mock('@/features/auth', () => ({
  useSignUp: () => ({ mutate: mockMutate, isPending: false, isError: false, error: null }),
}));

const renderScreen = () =>
  render(
    <ThemeProvider>
      <SignUpScreen />
    </ThemeProvider>,
  );

describe('SignUpScreen', () => {
  beforeEach(() => mockMutate.mockClear());

  it('no envía si los datos son inválidos y muestra los errores', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('pide que las contraseñas coincidan', async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByLabelText('Correo'), 'ale@ejemplo.mx');
    await fireEvent.changeText(
      screen.getByLabelText('Contraseña (mínimo 8 caracteres)'),
      '12345678',
    );
    await fireEvent.changeText(screen.getByLabelText('Repite la contraseña'), '1234567x');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('envía con datos válidos', async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByLabelText('Correo'), 'ale@ejemplo.mx');
    await fireEvent.changeText(
      screen.getByLabelText('Contraseña (mínimo 8 caracteres)'),
      '12345678',
    );
    await fireEvent.changeText(screen.getByLabelText('Repite la contraseña'), '12345678');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(mockMutate).toHaveBeenCalledWith({ email: 'ale@ejemplo.mx', password: '12345678' });
  });
});

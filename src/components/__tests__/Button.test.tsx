import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '@/theme';

import { Button } from '../Button';

const wrap = (ui: ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Button', () => {
  it('llama onPress al tocarlo', async () => {
    const onPress = jest.fn();
    await wrap(<Button title="Pegar mi respuesta" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pegar mi respuesta' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no llama onPress si está deshabilitado', async () => {
    const onPress = jest.fn();
    await wrap(<Button title="Guardar" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Guardar' });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('no llama onPress mientras carga y se anuncia ocupado', async () => {
    const onPress = jest.fn();
    await wrap(<Button title="Reintentar" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Reintentar' });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeBusy();
  });

  it.each(['primary', 'secondary', 'ghost'] as const)(
    'renderiza la variante %s',
    async (variant) => {
      await wrap(<Button title="Hola" variant={variant} icon="plus" />);
      expect(screen.getByText('Hola')).toBeTruthy();
    },
  );
});

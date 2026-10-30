import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '@/theme';

import { Input } from '../Input';

const wrap = (ui: ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Input', () => {
  it('muestra la etiqueta y el error', async () => {
    await wrap(
      <Input label="Tu apodo" value="" onChangeText={() => {}} error="Escribe un apodo." />,
    );
    expect(screen.getByText('Tu apodo')).toBeTruthy();
    expect(screen.getByText('Escribe un apodo.')).toBeTruthy();
  });

  it('llama onChangeText al escribir', async () => {
    const onChangeText = jest.fn();
    await wrap(<Input label="Nota" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('Nota'), 'hola');
    expect(onChangeText).toHaveBeenCalledWith('hola');
  });

  it('variante multiline renderiza', async () => {
    await wrap(<Input label="Carta" variant="multiline" value="x" onChangeText={() => {}} />);
    expect(screen.getByLabelText('Carta')).toBeTruthy();
  });
});

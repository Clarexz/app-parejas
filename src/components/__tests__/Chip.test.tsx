import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '@/theme';

import { Chip } from '../Chip';

const wrap = (ui: ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Chip', () => {
  it('expone selected en accessibilityState', async () => {
    await wrap(<Chip label="Viajes" selected onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Viajes' })).toBeSelected();
  });

  it('no está seleccionado por defecto y llama onPress', async () => {
    const onPress = jest.fn();
    await wrap(<Chip label="Comida" color="mint" onPress={onPress} />);
    const chip = screen.getByRole('button', { name: 'Comida' });
    expect(chip).not.toBeSelected();
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalled();
  });

  it('deshabilitado no llama onPress', async () => {
    const onPress = jest.fn();
    await wrap(<Chip label="Cine" color="pink" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Cine' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

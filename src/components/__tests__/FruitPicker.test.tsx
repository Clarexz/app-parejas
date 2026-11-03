import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ThemeProvider } from '@/theme';

import { FruitPicker, blockedReason } from '../FruitPicker';
import { fruitOptions } from '@/lib/fruits';

const wrap = (ui: ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('FruitPicker', () => {
  it('muestra las 7 frutas con su nombre', async () => {
    await wrap(<FruitPicker value="sandia" partnerFruit={null} onChange={() => {}} />);
    for (const name of ['Sandía', 'Mango', 'Mandarina', 'Limón', 'Uva', 'Arándano', 'Pitaya']) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.getAllByRole('radio')).toHaveLength(7);
  });

  it('elegir una fruta libre llama onChange', async () => {
    const onChange = jest.fn();
    await wrap(<FruitPicker value="sandia" partnerFruit={null} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Uva' }));
    expect(onChange).toHaveBeenCalledWith('uva');
  });

  it('una fruta bloqueada no dispara onChange y queda deshabilitada', async () => {
    const onChange = jest.fn();
    // Pareja con Mango: Mango es la misma y Limón se le parece.
    await wrap(
      <FruitPicker value="sandia" partnerFruit="mango" partnerName="Ximena" onChange={onChange} />,
    );
    const same = screen.getByRole('radio', { name: /^Mango/ });
    const similar = screen.getByRole('radio', { name: /^Limón/ });
    expect(same.props.accessibilityState.disabled).toBe(true);
    expect(similar.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(same);
    await fireEvent.press(similar);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('es de Ximena')).toBeTruthy();
    expect(screen.getAllByText('se parece a la suya')).toHaveLength(2);
  });

  it('marca la seleccionada y la sugerida', async () => {
    await wrap(<FruitPicker value="uva" partnerFruit="mango" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Uva' }).props.accessibilityState.selected).toBe(true);
    // Mango sugiere Sandía.
    expect(screen.getByText('sugerida')).toBeTruthy();
  });

  it('el motivo depende del tipo de choque', () => {
    const options = fruitOptions('sandia');
    const same = options.find((o) => o.fruit.key === 'sandia');
    const similar = options.find((o) => o.fruit.key === 'pitaya');
    const free = options.find((o) => o.fruit.key === 'uva');
    expect(blockedReason(same!, 'Ale')).toBe('es de Ale');
    expect(blockedReason(same!)).toBe('es de tu pareja');
    expect(blockedReason(similar!)).toBe('se parece a la suya');
    expect(blockedReason(free!)).toBeNull();
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState, type ReactElement } from 'react';

import { ThemeProvider } from '@/theme';

import { AvatarPicker } from '../AvatarPicker';
import { CodeInput, normalizeCode } from '../CodeInput';
import { DateField, digitsOnly, type DateParts } from '../DateField';
import { InviteCode, spokenCode } from '../InviteCode';
import { ListRow } from '../ListRow';
import { TabBar, TAB_ICONS, type TabBarProps } from '../TabBar';
import { WaitingIllustration } from '../illustrations';

const wrap = (ui: ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('DateField', () => {
  it('limpia a dígitos', () => {
    expect(digitsOnly('1a2/3', 2)).toBe('12');
    expect(digitsOnly('19901', 4)).toBe('1990');
  });

  it('captura cada casilla y muestra el error', async () => {
    const onChange = jest.fn();
    await wrap(
      <DateField
        label="Su aniversario"
        value={{ day: '', month: '', year: '' }}
        onChange={onChange}
        error="Esa fecha no existe."
      />,
    );
    expect(screen.getByText('Su aniversario')).toBeTruthy();
    expect(screen.getByText('Esa fecha no existe.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Día'), '1x4');
    expect(onChange).toHaveBeenCalledWith({ day: '14', month: '', year: '' });
    await fireEvent.changeText(screen.getByLabelText('Año'), '2020');
    expect(onChange).toHaveBeenLastCalledWith({ day: '', month: '', year: '2020' });
  });

  it('salta el foco al llenar el día', async () => {
    function Harness() {
      const [v, setV] = useState<DateParts>({ day: '', month: '', year: '' });
      return <DateField value={v} onChange={setV} />;
    }
    await wrap(<Harness />);
    await fireEvent.changeText(screen.getByLabelText('Día'), '07');
    expect(screen.getByLabelText('Día').props.value).toBe('07');
  });

  it('deshabilitado no es editable', async () => {
    await wrap(<DateField value={{ day: '', month: '', year: '' }} onChange={() => {}} disabled />);
    expect(screen.getByLabelText('Mes').props.editable).toBe(false);
  });
});

describe('CodeInput', () => {
  it('normaliza: mayúsculas, sin espacios ni guiones, solo el alfabeto', () => {
    expect(normalizeCode('abc-234')).toBe('ABC234');
    expect(normalizeCode('a b c 2 3 4 5 6')).toBe('ABC234');
    expect(normalizeCode('0O1Il')).toBe('');
  });

  it('entrega el código normalizado', async () => {
    const onChangeText = jest.fn();
    await wrap(<CodeInput value="" onChangeText={onChangeText} error="Ese código no existe." />);
    await fireEvent.changeText(screen.getByLabelText('Código de invitación'), 'xy z-9');
    expect(onChangeText).toHaveBeenCalledWith('XYZ9');
    expect(screen.getByText('Ese código no existe.')).toBeTruthy();
  });
});

describe('InviteCode', () => {
  it('lee el código letra por letra y comparte', async () => {
    const onShare = jest.fn();
    await wrap(<InviteCode code="ABC234" onShare={onShare} />);
    expect(spokenCode('ABC234')).toBe('A B C 2 3 4');
    expect(screen.getByLabelText('Código de invitación: A B C 2 3 4')).toBeTruthy();
    await fireEvent.press(screen.getByText('Compartir código'));
    expect(onShare).toHaveBeenCalled();
  });

  it('cargando no muestra el código', async () => {
    await wrap(<InviteCode code="ABC234" loading onShare={() => {}} />);
    expect(screen.getByLabelText('Generando el código de invitación')).toBeTruthy();
    expect(screen.queryByText('A')).toBeNull();
  });
});

describe('AvatarPicker', () => {
  it('sin foto muestra la inicial y permite elegir', async () => {
    const onPick = jest.fn();
    await wrap(<AvatarPicker name="Ale" onPick={onPick} />);
    expect(screen.getByText('A')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Elegir foto'));
    expect(onPick).toHaveBeenCalled();
  });

  it('cargando deshabilita el botón', async () => {
    const onPick = jest.fn();
    await wrap(<AvatarPicker name="Ale" uri="https://x.invalid/a.jpg" onPick={onPick} loading />);
    await fireEvent.press(screen.getByLabelText('Cambiar foto'));
    expect(onPick).not.toHaveBeenCalled();
  });
});

describe('ListRow', () => {
  it('toca y marca destructivo', async () => {
    const onPress = jest.fn();
    await wrap(<ListRow label="Cerrar sesión" icon="lock" tone="destructive" onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText('Cerrar sesión'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('TabBar', () => {
  const makeProps = (index: number) => {
    const emit = jest.fn(() => ({ defaultPrevented: false }));
    const navigateToTab = jest.fn();
    const routes = [
      { key: 'index-1', name: 'index' },
      { key: 'more-1', name: 'more' },
    ];
    const descriptors = {
      'index-1': { options: { title: 'Inicio' } },
      'more-1': { options: { title: 'Más' } },
    };
    const props = {
      state: { index, routes },
      descriptors,
      emitter: { emit },
      navigateToTab,
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    } as unknown as TabBarProps;
    return { props, emit, navigateToTab };
  };

  it('marca la pestaña activa y navega a la otra', async () => {
    const { props, navigateToTab } = makeProps(0);
    await wrap(<TabBar {...props} />);
    expect(screen.getByLabelText('Inicio').props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByLabelText('Más'));
    expect(navigateToTab).toHaveBeenCalledWith('more-1');
  });

  it('no navega a la pestaña ya activa', async () => {
    const { props, navigateToTab } = makeProps(1);
    await wrap(<TabBar {...props} />);
    await fireEvent.press(screen.getByLabelText('Más'));
    expect(navigateToTab).not.toHaveBeenCalled();
  });

  it('mapa de iconos por ruta', () => {
    expect(TAB_ICONS).toMatchObject({
      index: 'home',
      more: 'more',
      questions: 'ask',
      stories: 'photo',
      memories: 'map',
    });
  });
});

describe('WaitingIllustration', () => {
  it('renderiza', async () => {
    await wrap(<WaitingIllustration />);
  });
});

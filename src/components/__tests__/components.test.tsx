import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text as RNText } from 'react-native';

import { ThemeProvider } from '@/theme';

import { Avatar } from '../Avatar';
import { EmptyState } from '../EmptyState';
import { FoldedNote } from '../FoldedNote';
import { ToastProvider, useToast } from '../Toast';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const wrap = async (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('FoldedNote', () => {
  it('cerrada no muestra el texto real', async () => {
    await wrap(
      <FoldedNote open={false}>
        <RNText>Te quiero un montón</RNText>
      </FoldedNote>,
    );
    expect(screen.queryByText('Te quiero un montón')).toBeNull();
    expect(screen.getByText('Doblada hasta que contestes')).toBeTruthy();
  });

  it('abierta muestra el texto real', async () => {
    await wrap(
      <FoldedNote open>
        <RNText>Te quiero un montón</RNText>
      </FoldedNote>,
    );
    expect(screen.getByText('Te quiero un montón')).toBeTruthy();
  });
});

describe('Toast', () => {
  function Trigger() {
    const { show } = useToast();
    return (
      <Pressable onPress={() => show({ message: 'Foto pegada', tone: 'success' })}>
        <RNText>abrir</RNText>
      </Pressable>
    );
  }

  it('show muestra el mensaje', async () => {
    await wrap(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    expect(screen.queryByText('Foto pegada')).toBeNull();
    await fireEvent.press(screen.getByText('abrir'));
    expect(screen.getByText('Foto pegada')).toBeTruthy();
  });

  it('se va solo a los 3.5 s', async () => {
    jest.useFakeTimers();
    await wrap(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await fireEvent.press(screen.getByText('abrir'));
    await act(async () => {
      jest.advanceTimersByTime(3600);
    });
    expect(screen.queryByText('Foto pegada')).toBeNull();
    jest.useRealTimers();
  });
});

describe('EmptyState', () => {
  it('la acción llama onAction', async () => {
    const onAction = jest.fn();
    await wrap(
      <EmptyState title="Nada por aquí" actionLabel="Pegar una foto" onAction={onAction} />,
    );
    await fireEvent.press(screen.getByText('Pegar una foto'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe('Avatar', () => {
  it('muestra la inicial en mayúscula', async () => {
    await wrap(<Avatar name="ale" />);
    expect(screen.getByText('A')).toBeTruthy();
  });
});

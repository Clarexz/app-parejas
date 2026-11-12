import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';

import { AudioBubble } from '../AudioBubble';

const audio = jest.requireMock('expo-audio') as {
  useAudioPlayer: jest.Mock;
  useAudioPlayerStatus: jest.Mock;
};

const wrap = async (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

function mockPlayer(status: Record<string, unknown> = {}) {
  const player = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => undefined) };
  audio.useAudioPlayer.mockReturnValue(player);
  audio.useAudioPlayerStatus.mockReturnValue({
    playing: false,
    currentTime: 0,
    duration: 7,
    didJustFinish: false,
    isLoaded: true,
    ...status,
  });
  return player;
}

describe('AudioBubble', () => {
  it('sin URL todavía: muestra la duración y no se puede tocar', async () => {
    await wrap(<AudioBubble uri={null} durationMs={7000} label="Audio de Caleb" />);
    expect(screen.getByText('0:07')).toBeTruthy();
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('si falló la URL, lo avisa', async () => {
    await wrap(<AudioBubble uri={null} durationMs={7000} error />);
    expect(screen.getByText('No se pudo cargar el audio.')).toBeTruthy();
  });

  it('toca para escuchar y para pausar', async () => {
    const player = mockPlayer();
    await wrap(<AudioBubble uri="https://x/a.m4a" durationMs={7000} label="Tu audio" />);
    expect(screen.getByText('0:07')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Escuchar tu audio/ }));
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.seekTo).not.toHaveBeenCalled();

    mockPlayer({ playing: true, currentTime: 2 });
    const paused = mockPlayer({ playing: true, currentTime: 2 });
    await wrap(<AudioBubble uri="https://x/a.m4a" durationMs={7000} label="Tu audio" />);
    await fireEvent.press(screen.getAllByRole('button', { name: /Pausar tu audio/ })[0]);
    expect(paused.pause).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('0:02').length).toBeGreaterThan(0);
  });

  it('al terminar, volver a tocar reproduce desde el inicio', async () => {
    const player = mockPlayer({ didJustFinish: true, currentTime: 7 });
    await wrap(<AudioBubble uri="https://x/a.m4a" durationMs={7000} />);
    await fireEvent.press(screen.getByRole('button', { name: /Escuchar audio/ }));
    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.play).toHaveBeenCalled();
  });
});

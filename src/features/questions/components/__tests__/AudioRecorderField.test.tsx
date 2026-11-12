import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { MAX_AUDIO_MS, type AudioDraft } from '@/lib/audio';
import { ThemeProvider } from '@/theme';

import { AudioRecorderField } from '../AudioRecorderField';

jest.mock('../../hooks', () => ({
  useAnswerAudioUrl: () => ({ url: null, isError: false }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

const audio = jest.requireMock('expo-audio') as {
  useAudioRecorder: jest.Mock;
  useAudioRecorderState: jest.Mock;
  requestRecordingPermissionsAsync: jest.Mock;
};

function mockRecorder(over: Record<string, unknown> = {}) {
  const recorder = {
    uri: 'file:///cache/rec.m4a',
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(),
    stop: jest.fn(async () => undefined),
    getStatus: jest.fn(() => ({ durationMillis: 7000 })),
    ...over,
  };
  audio.useAudioRecorder.mockReturnValue(recorder);
  audio.useAudioRecorderState.mockReturnValue({
    canRecord: true,
    isRecording: true,
    durationMillis: 3000,
  });
  return recorder;
}

const grant = (granted: boolean, canAskAgain = true) =>
  audio.requestRecordingPermissionsAsync.mockResolvedValue({
    granted,
    status: granted ? 'granted' : 'denied',
    canAskAgain,
    expires: 'never',
  });

const wrap = async (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('AudioRecorderField', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('sin audio ofrece "Grabar audio" y no pide permiso hasta tocarlo', async () => {
    mockRecorder();
    await wrap(<AudioRecorderField value={null} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Grabar audio' })).toBeTruthy();
    expect(audio.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
  });

  it('si niegan el micrófono muestra la nota de permiso y no graba', async () => {
    const recorder = mockRecorder();
    grant(false, false);
    await wrap(<AudioRecorderField value={null} onChange={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Grabar audio' }));
    expect(await screen.findByText(/El micrófono está apagado para esta app/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Abrir ajustes del celular' })).toBeTruthy();
    expect(recorder.record).not.toHaveBeenCalled();
  });

  it('graba, muestra el tiempo y al detener entrega el audio nuevo', async () => {
    const recorder = mockRecorder();
    grant(true);
    const onChange = jest.fn();
    const onBusyChange = jest.fn();
    await wrap(<AudioRecorderField value={null} onChange={onChange} onBusyChange={onBusyChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Grabar audio' }));
    expect(await screen.findByText('0:03')).toBeTruthy();
    expect(recorder.record).toHaveBeenCalledTimes(1);
    expect(onBusyChange).toHaveBeenLastCalledWith(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Detener' }));
    await act(async () => undefined);
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      kind: 'new',
      uri: 'file:///cache/rec.m4a',
      ms: 7000,
    });
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it('se corta solo a los 2 minutos', async () => {
    const recorder = mockRecorder({ getStatus: jest.fn(() => ({ durationMillis: 120_040 })) });
    grant(true);
    const onChange = jest.fn();
    await wrap(<AudioRecorderField value={null} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Grabar audio' }));
    await screen.findByRole('button', { name: 'Detener' });
    await act(async () => {
      jest.advanceTimersByTime(MAX_AUDIO_MS + 10);
    });
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'new', ms: MAX_AUDIO_MS }),
    );
  });

  it('una grabación demasiado corta se descarta con aviso', async () => {
    mockRecorder({ getStatus: jest.fn(() => ({ durationMillis: 200 })) });
    grant(true);
    const onChange = jest.fn();
    await wrap(<AudioRecorderField value={null} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Grabar audio' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Detener' }));
    expect(await screen.findByText('Ese audio quedó muy corto. Grábalo otra vez.')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('con audio: permite volver a grabar y quitarlo', async () => {
    mockRecorder();
    const onChange = jest.fn();
    const value: AudioDraft = { kind: 'new', uri: 'file:///cache/rec.m4a', ms: 7000 };
    await wrap(<AudioRecorderField value={value} onChange={onChange} />);
    expect(screen.getByText('0:07')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Volver a grabar' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Quitar audio' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

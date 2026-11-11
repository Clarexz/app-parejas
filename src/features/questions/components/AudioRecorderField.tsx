import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import {
  AudioBubble,
  Button,
  Notice,
  PermissionNote,
  Text,
  type PermissionStatus,
} from '@/components';
import {
  MAX_AUDIO_MS,
  formatAudioDuration,
  normalizeAudioMs,
  spokenAudioDuration,
  type AudioDraft,
} from '@/lib/audio';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { AnswerAudio } from './AnswerAudio';

/** Grabar solo se ofrece en el celular (la web es únicamente para QA visual): ahí no se muestra. */
export const AUDIO_RECORDING_SUPPORTED = Platform.OS !== 'web';

// Mono y 64 kb/s: voz clara y ~1 MB por 2 minutos (el bucket admite 3 MB).
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
};

type Props = {
  value: AudioDraft | null;
  onChange: (value: AudioDraft | null) => void;
  disabled?: boolean;
  /** Avisa cuando se está grabando o preparando (para frenar el botón de contestar). */
  onBusyChange?: (busy: boolean) => void;
};

type Phase = 'idle' | 'starting' | 'recording' | 'stopping';

/**
 * Grabar la respuesta con la voz (solo preguntas abiertas). Sin audio: "Grabar audio". Grabando:
 * tiempo corriendo y "Detener" (se corta solo a los 2 min). Con audio: escucharlo, volver a
 * grabar o quitarlo. El permiso del micrófono se pide hasta que tocas grabar.
 */
export function AudioRecorderField({ value, onChange, disabled = false, onBusyChange }: Props) {
  const { colors, spacing, radius } = useTheme();
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const state = useAudioRecorderState(recorder, 250);
  const [phase, setPhase] = useState<Phase>('idle');
  const [permission, setPermission] = useState<{
    status: PermissionStatus;
    canAskAgain: boolean;
  } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const startedAtRef = useRef(0);
  const cutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const elapsed = phase === 'recording' ? state.durationMillis : 0;

  const go = (next: Phase) => {
    const wasBusy = phaseRef.current !== 'idle';
    phaseRef.current = next;
    setPhase(next);
    if (wasBusy !== (next !== 'idle')) onBusyChange?.(next !== 'idle');
  };

  const clearCut = () => {
    if (cutRef.current) clearTimeout(cutRef.current);
    cutRef.current = null;
  };

  const stop = async () => {
    if (phaseRef.current !== 'recording') return;
    clearCut();
    go('stopping');
    try {
      const live = recorder.getStatus().durationMillis;
      const measured = live > 0 ? live : Date.now() - startedAtRef.current;
      await recorder.stop();
      const ms = normalizeAudioMs(measured);
      const uri = recorder.uri;
      if (!uri) throw new Error('sin archivo');
      if (ms === null) {
        setProblem('Ese audio quedó muy corto. Grábalo otra vez.');
      } else {
        onChange({ kind: 'new', uri, ms });
      }
    } catch {
      setProblem('No pudimos guardar la grabación. Intenta otra vez.');
    } finally {
      try {
        await setAudioModeAsync({ allowsRecording: false });
      } catch {
        // el modo de audio se restablece solo
      }
      go('idle');
    }
  };

  const start = async () => {
    if (phaseRef.current !== 'idle') return;
    setProblem(null);
    go('starting');
    try {
      const result = await requestRecordingPermissionsAsync();
      if (!result.granted) {
        setPermission({
          status: result.status === 'undetermined' ? 'undetermined' : 'denied',
          canAskAgain: result.canAskAgain,
        });
        go('idle');
        return;
      }
      setPermission(null);
      await setAudioModeAsync({ allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAtRef.current = Date.now();
      // Corte automático a los 2 minutos.
      cutRef.current = setTimeout(() => void stop(), MAX_AUDIO_MS);
      haptic.light();
      go('recording');
    } catch {
      setProblem('No pudimos empezar a grabar. Intenta otra vez.');
      go('idle');
    }
  };

  // Si te sales de la pantalla grabando, se detiene (el recorder se libera solo al desmontar).
  useEffect(
    () => () => {
      clearCut();
      if (phaseRef.current === 'recording') void recorder.stop().catch(() => undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (phase === 'recording' || phase === 'stopping') {
    const time = formatAudioDuration(elapsed);
    return (
      <View
        style={{
          gap: spacing.md,
          padding: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.card,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: radius.pill,
              backgroundColor: colors.danger,
            }}
          />
          <Text
            variant="h3"
            accessibilityLabel={`Grabando, ${spokenAudioDuration(elapsed)}`}
            accessibilityLiveRegion="none"
          >
            {time}
          </Text>
          <Text variant="note" tone="muted" style={{ flex: 1, textAlign: 'right' }}>
            Máximo {formatAudioDuration(MAX_AUDIO_MS)}
          </Text>
        </View>
        <Button
          title="Detener"
          icon="stop"
          variant="secondary"
          fullWidth
          loading={phase === 'stopping'}
          onPress={() => void stop()}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      {value ? (
        <>
          {value.kind === 'new' ? (
            <AudioBubble uri={value.uri} durationMs={value.ms} label="Tu audio" />
          ) : (
            <AnswerAudio path={value.path} durationMs={value.ms} label="Tu audio" />
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Button
              title="Volver a grabar"
              icon="mic"
              variant="secondary"
              size="sm"
              disabled={disabled || phase !== 'idle'}
              loading={phase === 'starting'}
              onPress={() => void start()}
            />
            <Button
              title="Quitar audio"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onPress={() => onChange(null)}
            />
          </View>
        </>
      ) : (
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            title="Grabar audio"
            icon="mic"
            variant="secondary"
            disabled={disabled}
            loading={phase === 'starting'}
            onPress={() => void start()}
          />
        </View>
      )}
      {permission ? (
        <PermissionNote
          kind="microphone"
          status={permission.status}
          canAskAgain={permission.canAskAgain}
          onRequest={() => void start()}
          onOpenSettings={() => void Linking.openSettings()}
          loading={phase === 'starting'}
        />
      ) : null}
      {problem ? <Notice tone="danger">{problem}</Notice> : null}
    </View>
  );
}

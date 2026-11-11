import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback } from 'react';
import { View } from 'react-native';

import { formatAudioDuration, playbackProgress, spokenAudioDuration } from '@/lib/audio';
import { useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

/** "Tu audio" -> "tu audio"; "Audio de Caleb" -> "audio de Caleb" (sin tocar el nombre). */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

type ViewProps = {
  playing: boolean;
  positionMs: number;
  durationMs: number;
  onToggle?: () => void;
  /** Todavía no hay archivo para reproducir (cargando la URL) o no se pudo cargar. */
  state?: 'ready' | 'loading' | 'error';
  /** A quién pertenece, para el lector de pantalla ("Audio de Caleb"). */
  label?: string;
};

/** Burbuja de audio sin lógica de reproducción: botón, barra de avance y tiempo. */
function BubbleView({
  playing,
  positionMs,
  durationMs,
  onToggle,
  state = 'ready',
  label = 'Audio',
}: ViewProps) {
  const { colors, spacing, radius } = useTheme();
  const progress = playbackProgress(positionMs, durationMs);
  const started = playing || positionMs > 0;
  const time = formatAudioDuration(started ? positionMs : durationMs);
  const disabled = state !== 'ready';

  return (
    <View
      accessible={false}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 56,
        paddingLeft: spacing.xs,
        paddingRight: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
      }}
    >
      <IconButton
        name={playing ? 'pause' : 'play'}
        variant="filled"
        disabled={disabled}
        onPress={onToggle}
        accessibilityLabel={
          state === 'error'
            ? `${label}, no se pudo cargar`
            : `${playing ? 'Pausar' : 'Escuchar'} ${lowerFirst(label)}, dura ${spokenAudioDuration(durationMs)}`
        }
      />
      {state === 'error' ? (
        <Text variant="note" tone="muted" style={{ flex: 1 }}>
          No se pudo cargar el audio.
        </Text>
      ) : (
        <>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`Avance de ${lowerFirst(label)}`}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
            style={{
              flex: 1,
              height: 6,
              borderRadius: radius.pill,
              backgroundColor: colors.line,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${progress * 100}%`,
                height: 6,
                borderRadius: radius.pill,
                backgroundColor: colors.action,
              }}
            />
          </View>
          <Text variant="ui" tone="muted" style={{ minWidth: 40, textAlign: 'right' }}>
            {time}
          </Text>
        </>
      )}
    </View>
  );
}

type PlayerProps = { uri: string; durationMs: number; label?: string };

function PlayerBubble({ uri, durationMs, label }: PlayerProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const onToggle = useCallback(() => {
    if (status.playing) {
      player.pause();
      return;
    }
    // Al terminar queda al final: volver a tocar lo reproduce desde el inicio.
    if (
      status.didJustFinish ||
      (status.duration > 0 && status.currentTime >= status.duration - 0.05)
    ) {
      void player.seekTo(0);
    }
    player.play();
  }, [player, status.playing, status.didJustFinish, status.duration, status.currentTime]);

  return (
    <BubbleView
      playing={status.playing}
      positionMs={status.didJustFinish ? 0 : Math.round(status.currentTime * 1000)}
      durationMs={durationMs > 0 ? durationMs : Math.round(status.duration * 1000)}
      onToggle={onToggle}
      label={label}
    />
  );
}

type Props = {
  /** Archivo local o URL firmada. `null` mientras se obtiene (o si falló: ver `error`). */
  uri: string | null;
  /** Duración conocida (ms), la de la respuesta. */
  durationMs: number;
  error?: boolean;
  /** "Audio de Caleb", "Tu audio"... para lectores de pantalla. */
  label?: string;
};

/**
 * Audio de una respuesta (DISENO §7): play/pausa en `IconButton`, barra de avance sencilla y
 * el tiempo ("0:07"). Sobre una `surface` para leerse bien encima del tinte de la fruta.
 */
export function AudioBubble({ uri, durationMs, error = false, label }: Props) {
  if (!uri) {
    return (
      <BubbleView
        playing={false}
        positionMs={0}
        durationMs={durationMs}
        state={error ? 'error' : 'loading'}
        label={label}
      />
    );
  }
  return <PlayerBubble uri={uri} durationMs={durationMs} label={label} />;
}

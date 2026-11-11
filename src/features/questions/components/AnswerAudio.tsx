import { AudioBubble } from '@/components';

import { useAnswerAudioUrl } from '../hooks';

type Props = {
  /** Ruta en el bucket `answer-audio`. */
  path: string;
  durationMs: number;
  /** "Tu audio", "Audio de Caleb": para lectores de pantalla. */
  label?: string;
};

/** Audio de una respuesta guardada: pide la URL firmada y la reproduce en una `AudioBubble`. */
export function AnswerAudio({ path, durationMs, label }: Props) {
  const { url, isError } = useAnswerAudioUrl(path);
  return <AudioBubble uri={url} durationMs={durationMs} error={isError} label={label} />;
}

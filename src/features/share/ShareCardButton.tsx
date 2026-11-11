import { Button, IconButton } from '@/components';
import type { ShareCardData } from '@/lib/shareCard';

import { useShareCard } from './useShareCard';

type Props = {
  data: ShareCardData;
  /** `icon`: solo ícono de 48 dp. `button`: botón secundario con texto "Compartir". */
  kind?: 'icon' | 'button';
  accessibilityLabel?: string;
};

/** Acción "Compartir" de una tarjeta-imagen: trae su propio lienzo fuera de pantalla. */
export function ShareCardButton({
  data,
  kind = 'icon',
  accessibilityLabel = 'Compartir como imagen',
}: Props) {
  const { share, host, sharing } = useShareCard();
  const onPress = () => void share(data);
  return (
    <>
      {kind === 'icon' ? (
        <IconButton
          name="share"
          variant="soft"
          accessibilityLabel={accessibilityLabel}
          disabled={sharing}
          onPress={onPress}
        />
      ) : (
        <Button
          title="Compartir"
          variant="secondary"
          size="sm"
          icon="share"
          loading={sharing}
          onPress={onPress}
        />
      )}
      {host}
    </>
  );
}

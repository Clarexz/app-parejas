import * as Sharing from 'expo-sharing';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactElement,
} from 'react';
import { Share, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH, ShareCard, useToast } from '@/components';
import { useNames } from '@/features/games/components/useNames';
import { shareCardCopy, type ShareCardData } from '@/lib/shareCard';

const SHARE_ERROR = 'No pudimos armar la imagen. Intenta otra vez en un momento.';
const NO_SHARE = 'Tu celular no deja compartir desde aquí. Prueba desde la app.';

/** Un frame de pantalla, para que la tarjeta ya esté pintada antes de capturarla. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export type UseShareCard = {
  /** Arma la tarjeta, la captura a PNG y abre la hoja de compartir del sistema. */
  share: (data: ShareCardData) => Promise<void>;
  /** Montar una vez en la pantalla: es la tarjeta fuera de pantalla que se captura. */
  host: ReactElement | null;
  sharing: boolean;
};

/**
 * Compartir como imagen: dibuja `ShareCard` fuera de pantalla, `captureRef` a PNG (tmpfile) y
 * `expo-sharing`. Si el celular/navegador no puede compartir archivos, cae al texto de siempre.
 */
export function useShareCard(): UseShareCard {
  const toast = useToast();
  const { meName, partnerName } = useNames();
  const [data, setData] = useState<ShareCardData | null>(null);
  const ref = useRef<ComponentRef<typeof View>>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const share = useCallback(
    async (next: ShareCardData) => {
      if (busy.current) return;
      busy.current = true;
      const copy = shareCardCopy(next);
      try {
        if (!(await Sharing.isAvailableAsync())) {
          // Web o sin hoja de archivos: el texto de siempre.
          try {
            await Share.share({ message: copy.text });
          } catch {
            toast.show({ message: NO_SHARE, tone: 'danger' });
          }
          return;
        }
        setData(next);
        await nextFrame();
        if (!ref.current) throw new Error('share card not mounted');
        const uri = await captureRef(ref, {
          format: 'png',
          result: 'tmpfile',
          width: SHARE_CARD_WIDTH,
          height: SHARE_CARD_HEIGHT,
        });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: copy.dialogTitle });
      } catch {
        // Cancelar la hoja no lanza error; si llega aquí, algo falló armando o abriendo.
        toast.show({ message: SHARE_ERROR, tone: 'danger' });
      } finally {
        busy.current = false;
        if (alive.current) setData(null);
      }
    },
    [toast],
  );

  const host = data ? (
    <View
      ref={ref}
      collapsable={false}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        top: 0,
        left: -SHARE_CARD_WIDTH * 2,
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
      }}
    >
      <ShareCard data={data} meName={meName} partnerName={partnerName} />
    </View>
  ) : null;

  return { share, host, sharing: data !== null };
}

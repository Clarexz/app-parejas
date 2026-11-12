/**
 * Textos de la tarjeta-imagen compartible (racha, tiempo juntos, juegos). Puro: la tarjeta y el
 * hook solo los dibujan. Voz del manual: nosotros, corto, mexicano, sin "¡Bienvenido…!".
 */
import { APP_NAME } from '@/constants/app';

import { formatNumber } from './dates';

export type ShareCardData =
  | { kind: 'streak'; days: number }
  | {
      kind: 'together';
      days: number;
      /** "3 años, 8 meses y 16 días"; vacío el primer día. */
      breakdown: string;
    }
  | { kind: 'game'; pct: number; matches: number; total: number; gameName: string };

export type ShareCardCopy = {
  /** Etiqueta sobre el número ("Racha"); la tarjeta la pone en MAYÚSCULAS. */
  label: string;
  /** El número protagonista ("12", "1,284", "87"). */
  value: string;
  /** Lo que va pegado al número ("días", "%"). */
  unit: string;
  /** Línea secundaria. */
  line: string;
  /** Texto de respaldo para `Share.share` cuando no se puede mandar la imagen. */
  text: string;
  /** Título de la hoja de compartir del sistema. */
  dialogTitle: string;
};

/** "1 día", "12 días", "1,284 días". */
export function daysLabel(n: number): string {
  return n === 1 ? '1 día' : `${formatNumber(n)} días`;
}

function safeDays(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

export function shareCardCopy(data: ShareCardData): ShareCardCopy {
  const signature = `Hecho en ${APP_NAME}`;
  switch (data.kind) {
    case 'streak': {
      const days = safeDays(data.days);
      const line = `Llevamos ${daysLabel(days)} contestando juntos`;
      return {
        label: 'Racha',
        value: formatNumber(days),
        unit: days === 1 ? 'día' : 'días',
        line,
        text: `${line}. ${signature}.`,
        dialogTitle: 'Compartir nuestra racha',
      };
    }
    case 'together': {
      const days = safeDays(data.days);
      const line = data.breakdown || 'Hoy empieza todo';
      return {
        label: 'Tiempo juntos',
        value: formatNumber(days),
        unit: days === 1 ? 'día' : 'días',
        line,
        text:
          days === 0
            ? `Hoy empieza todo. ${signature}.`
            : `Llevamos ${daysLabel(days)} juntos${data.breakdown ? ` (${data.breakdown})` : ''}. ${signature}.`,
        dialogTitle: 'Compartir nuestro tiempo juntos',
      };
    }
    case 'game': {
      const pct = Math.min(100, Math.max(0, Math.round(data.pct)));
      const line = `Coincidimos en ${data.matches} de ${data.total}`;
      return {
        label: data.gameName,
        value: String(pct),
        unit: '%',
        line,
        text: `${data.gameName}: coincidimos en ${pct}%. ${line}. ${signature}.`,
        dialogTitle: 'Compartir nuestro resultado',
      };
    }
  }
}

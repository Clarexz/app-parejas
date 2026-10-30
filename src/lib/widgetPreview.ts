/**
 * Modelo de ejemplo para la pantalla "Cómo agregar widgets": usa los datos reales de la pareja
 * (aniversario y nombre) cuando existen y completa lo demás con un mood de muestra, para que las
 * vistas previas se vean llenas aunque todavía no haya nada capturado.
 */
import { buildWidgetSnapshot, widgetModel, type WidgetModel } from './widgets';

export type PreviewInput = {
  anniversary?: string | null;
  timezone?: string | null;
  meName?: string | null;
  meBirthday?: string | null;
  partnerName?: string | null;
  partnerBirthday?: string | null;
  now?: Date;
};

export function previewModel(input: PreviewInput = {}): WidgetModel {
  const now = input.now ?? new Date();
  const snapshot = buildWidgetSnapshot({
    anniversary: input.anniversary,
    timezone: input.timezone,
    me: { name: input.meName, birthday: input.meBirthday },
    partner: { name: input.partnerName, birthday: input.partnerBirthday },
    partnerMood: {
      emoji: '🥰',
      note: 'Con tacos en el camino a casa',
      created_at: new Date(now.getTime() - 25 * 60_000).toISOString(),
    },
    now,
  });
  return widgetModel(snapshot, now);
}

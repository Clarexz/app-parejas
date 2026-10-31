/**
 * Modelo de ejemplo para la pantalla "Cómo agregar widgets": usa los datos reales de la pareja
 * (aniversario y nombre) cuando existen y completa lo demás con un mood y una story de muestra, para que las
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
    partnerId: 'preview',
    partnerStory: {
      id: 'preview',
      kind: 'text',
      created_at: new Date(now.getTime() - 40 * 60_000).toISOString(),
      expires_at: new Date(now.getTime() + 23 * 3_600_000).toISOString(),
      text: 'Hoy cenamos tacos, ¿va?',
      bg: 'postit',
      font: 'hand',
    },
    now,
  });
  return widgetModel(snapshot, now);
}

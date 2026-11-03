// Qué dibuja cada widget 1×1: la forma (con sus parámetros), el dato de una línea que va debajo,
// la descripción para lectores de pantalla y a dónde lleva el toque. Función pura sobre el
// `WidgetModel` (src/lib/widgets.ts); la usan el widget real y la vista previa de la app.
import { APP_NAME } from '@/constants/app';
import { formatNumber } from '@/lib/dates';
import { formatKm, spokenKm } from '@/lib/distance';
import { FRUITS, type FruitKey } from '@/lib/fruits';
import type { WidgetModel, WidgetName } from '@/lib/widgets';

import {
  daysShapeSvg,
  distShapeSvg,
  emptyShapeSvg,
  moodShapeSvg,
  nextShapeSvg,
  storyShapeSvg,
  streakShapeSvg,
  type MoodFace,
  type WidgetShapeOptions,
} from './components/svg';

export type WidgetFace =
  | { shape: 'days' }
  | { shape: 'mood'; face: MoodFace }
  | { shape: 'next'; progress: number }
  | { shape: 'dist'; km: number | null }
  | { shape: 'story'; photo: string | null; dot: boolean }
  | { shape: 'streak'; active: boolean }
  | { shape: 'empty' };

export type WidgetView = {
  face: WidgetFace;
  /** El dato de una línea, en minúsculas ("412 días", "feliz", "faltan 12"). */
  text: string;
  /** Descripción completa para lectores de pantalla. */
  a11y: string;
  /** Ruta del deep link si no es la de `WIDGET_ROUTES`. */
  route?: string;
  fruits: { me: FruitKey; partner: FruitKey };
};

const SAD = ['😤', '😫', '🥺', '😢'];
const MEH = ['😅', '🤔', '😴'];

/** Carita de la burbuja según el emoji del mood (la sonrisa del prototipo por defecto). */
export function moodFace(emoji: string): MoodFace {
  if (SAD.includes(emoji)) return 'frown';
  if (MEH.includes(emoji)) return 'flat';
  return 'smile';
}

const plural = (n: number, one: string, many: string): string =>
  `${formatNumber(n)} ${n === 1 ? one : many}`;

const brand = (): string => APP_NAME.toLowerCase();

export function widgetView(name: WidgetName, model: WidgetModel): WidgetView {
  const me = model.fruits.me;
  const partner = model.fruits.partner ?? FRUITS[me].suggested;
  const fruits = { me, partner };
  const who = model.partnerName;
  const empty = (text: string, a11y: string): WidgetView => ({
    face: { shape: 'empty' },
    text,
    a11y,
    fruits,
  });

  if (model.status === 'signed_out') {
    return empty(`abre ${brand()}`, `Abre ${APP_NAME} para empezar. Toca para abrirla.`);
  }
  if (model.status === 'no_couple') {
    return empty('sin pareja', `Todavía no tienes pareja en ${APP_NAME}. Toca para vincularla.`);
  }

  switch (name) {
    case 'DaysTogether': {
      const count = model.daysTogether ?? model.daysUntilStart;
      if (count === null) {
        return empty('sin fecha', 'Todavía no tienen fecha de aniversario. Toca para ponerla.');
      }
      const upcoming = model.daysTogether === null;
      return {
        face: { shape: 'days' },
        text: upcoming ? `faltan ${formatNumber(count)}` : plural(count, 'día', 'días'),
        a11y: upcoming
          ? `Faltan ${plural(count, 'día', 'días')} para su aniversario con ${who}.`
          : `${plural(count, 'día', 'días')} juntos con ${who}.`,
        fruits,
      };
    }
    case 'PartnerMood': {
      const mood = model.partnerMood;
      if (!mood) {
        return empty('sin mood', `${who} aún no comparte su mood. Toca para ver los moods.`);
      }
      return {
        face: { shape: 'mood', face: moodFace(mood.emoji) },
        text: mood.label ? mood.label.toLowerCase() : 'su mood',
        a11y: `${who} se siente ${mood.label ?? 'así'} ${mood.emoji}${
          mood.note ? `: ${mood.note}` : ''
        }${mood.ago ? `, ${mood.ago}` : ''}.`,
        fruits,
      };
    }
    case 'Countdown': {
      const ev = model.nextEvent;
      if (!ev) return empty('sin planes', 'No hay una fecha próxima. Toca para agregar una.');
      const n = ev.daysUntil;
      return {
        face: { shape: 'next', progress: n === 0 ? 1 : ev.progress },
        text: n === 0 ? 'hoy' : n === 1 ? 'mañana' : `faltan ${formatNumber(n)}`,
        a11y:
          n === 0
            ? `Hoy es ${ev.title}.`
            : n === 1
              ? `Mañana es ${ev.title}.`
              : `Faltan ${formatNumber(n)} días para ${ev.title}.`,
        fruits,
      };
    }
    case 'Distance': {
      const d = model.distance;
      if (!d || d.km === null) {
        const a11y = !d
          ? 'Activen su distancia en la app para ver cuántos kilómetros hay entre ustedes.'
          : !d.meSharing
            ? 'Activa tu distancia en la app para ver cuántos kilómetros hay entre ustedes.'
            : `Cuando ${who} active su distancia verás cuántos kilómetros hay entre ustedes.`;
        return empty('sin distancia', a11y);
      }
      return {
        face: { shape: 'dist', km: d.km },
        text: formatKm(d.km),
        a11y: `Están a ${spokenKm(d.km)}.`,
        fruits,
      };
    }
    case 'PartnerStory': {
      const story = model.partnerStory;
      return {
        face: {
          shape: 'story',
          photo: story?.kind === 'photo' ? story.thumb : null,
          dot: story !== null,
        },
        text: story ? 'nueva' : 'ver',
        a11y: story
          ? `${who} subió una story ${story.ago}. Toca para verla.`
          : `${who} no ha subido nada hoy. Toca para abrir las stories.`,
        route: story && model.partnerId ? `/story/view?user=${model.partnerId}` : '/stories',
        fruits,
      };
    }
    case 'Streak': {
      const s = model.streak;
      if (!s) return empty(`abre ${brand()}`, 'Abre la app para ver su racha de preguntas.');
      const active = s.current > 0;
      return {
        face: { shape: 'streak', active },
        text: active ? plural(s.current, 'día', 'días') : 'a contestar',
        a11y: active
          ? `Llevan una racha de ${plural(s.current, 'día', 'días')} contestando la pregunta del día.${
              s.answeredToday ? '' : ' Falta contestar la de hoy.'
            }`
          : 'No tienen racha todavía. Contesten la pregunta del día para encenderla.',
        fruits,
      };
    }
  }
}

/** SVG de la forma de un widget; `size` es el lado en dp. */
export function widgetShapeSvg(
  view: WidgetView,
  opts: { dark: boolean; size: number; id?: string },
): string {
  const o: WidgetShapeOptions = { ...view.fruits, ...opts };
  const face = view.face;
  switch (face.shape) {
    case 'days':
      return daysShapeSvg(o);
    case 'mood':
      return moodShapeSvg({ ...o, face: face.face });
    case 'next':
      return nextShapeSvg({ ...o, progress: face.progress });
    case 'dist':
      return distShapeSvg({ ...o, km: face.km });
    case 'story':
      return storyShapeSvg({ ...o, photo: face.photo, dot: face.dot });
    case 'streak':
      return streakShapeSvg({ ...o, active: face.active });
    case 'empty':
      return emptyShapeSvg(o);
  }
}

import { buildWidgetTree } from 'react-native-android-widget/src/api/build-widget-tree';

import {
  buildWidgetSnapshot,
  emptyWidgetSnapshot,
  WIDGET_NAMES,
  WIDGET_ROUTES,
  widgetModel,
  type WidgetModel,
} from '@/lib/widgets';

import { renderWidget } from '../render';

const NOW = new Date('2026-10-30T18:00:00Z');

const ready = buildWidgetSnapshot({
  anniversary: '2023-02-14',
  timezone: 'America/Mexico_City',
  me: { name: 'Ale', birthday: '1996-08-03' },
  partner: { name: 'Caleb', birthday: '1995-05-20' },
  partnerMood: {
    emoji: '🥰',
    note: 'Con tacos en el camino a casa',
    created_at: '2026-10-30T17:35:00Z',
  },
  partnerId: '11111111-1111-4111-8111-111111111111',
  now: NOW,
});

const STORY_BASE = {
  id: 's1',
  created_at: '2026-10-30T16:00:00Z',
  expires_at: '2026-10-31T16:00:00Z',
};
const withStory = (partnerStory: Parameters<typeof buildWidgetSnapshot>[0]['partnerStory']) =>
  widgetModel(
    buildWidgetSnapshot({
      anniversary: '2023-02-14',
      timezone: 'America/Mexico_City',
      me: { name: 'Ale', birthday: null },
      partner: { name: 'Caleb', birthday: null },
      partnerMood: null,
      partnerId: '11111111-1111-4111-8111-111111111111',
      partnerStory,
      now: NOW,
    }),
    NOW,
  );
// JPEG mínimo en base64 (el render no lo decodifica).
const THUMB = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////';

const MODELS: Record<string, WidgetModel> = {
  ready: widgetModel(ready, NOW),
  sinMood: widgetModel({ ...ready, partnerMood: null }, NOW),
  sinAniversario: widgetModel({ ...ready, anniversary: null, me: null, partner: null }, NOW),
  porEmpezar: widgetModel({ ...ready, anniversary: '2026-11-12' }, NOW),
  cerrado: widgetModel(emptyWidgetSnapshot('signed_out', NOW), NOW),
  sinPareja: widgetModel(emptyWidgetSnapshot('no_couple', NOW), NOW),
  storyFoto: withStory({ ...STORY_BASE, kind: 'photo', thumb: THUMB, text: 'Desayuno' }),
  storyFotoSinMiniatura: withStory({ ...STORY_BASE, kind: 'photo' }),
  storyTexto: withStory({
    ...STORY_BASE,
    kind: 'text',
    text: 'Te quiero muchísimo, nos vemos en la noche para cenar tacos y ver una peli.',
    bg: 'jamaica',
    font: 'stamp',
  }),
  storyDibujo: withStory({
    ...STORY_BASE,
    kind: 'drawing',
    bg: 'ink',
    strokes: [
      { c: 'chile', w: 8, p: [10, 10, 400, 800, 880, 1500] },
      { c: 'tapeMint', w: 40, o: 0.4, p: [100, 100, 200, 200] },
    ],
  }),
};

const SIZES = [
  { width: 110, height: 110 },
  { width: 160, height: 160 },
  { width: 250, height: 110 },
  { width: 320, height: 130 },
];

describe('renderWidget', () => {
  for (const name of WIDGET_NAMES) {
    for (const [modelName, model] of Object.entries(MODELS)) {
      for (const size of SIZES) {
        it(`${name} / ${modelName} / ${size.width}x${size.height} produce claro y oscuro`, () => {
          const out = renderWidget(name, model, size);
          expect(out).toHaveProperty('light');
          expect(out).toHaveProperty('dark');
          const { light, dark } = out as { light: React.JSX.Element; dark: React.JSX.Element };
          expect(() => buildWidgetTree(light)).not.toThrow();
          expect(() => buildWidgetTree(dark)).not.toThrow();
        });
      }
    }
  }

  it('todo el widget abre la ruta del deep link', () => {
    const expected: Record<string, string> = {
      DaysTogether: 'appparejas://',
      PartnerMood: 'appparejas://moods',
      Countdown: 'appparejas://',
      PartnerStory: 'appparejas://stories',
    };
    for (const name of WIDGET_NAMES) {
      const { light } = renderWidget(name, MODELS.ready, SIZES[2]) as { light: React.JSX.Element };
      const tree = buildWidgetTree(light) as { props: Record<string, unknown> };
      expect(tree.props.clickAction).toBe('OPEN_URI');
      expect(tree.props.clickActionData).toEqual({ uri: expected[name] });
      expect(typeof tree.props.accessibilityLabel).toBe('string');
      expect(WIDGET_ROUTES[name]).toBeDefined();
    }
  });

  it('la story abre la de tu pareja', () => {
    const { light } = renderWidget('PartnerStory', MODELS.storyFoto, SIZES[2]) as {
      light: React.JSX.Element;
    };
    const tree = buildWidgetTree(light) as { props: Record<string, unknown> };
    expect(tree.props.clickActionData).toEqual({
      uri: 'appparejas://story/view?user=11111111-1111-4111-8111-111111111111',
    });
    expect(String(tree.props.accessibilityLabel)).toContain('una foto');
  });

  it('sin story invita a pegar una', () => {
    const { light } = renderWidget('PartnerStory', MODELS.ready, SIZES[0]) as {
      light: React.JSX.Element;
    };
    const tree = buildWidgetTree(light) as { props: Record<string, unknown> };
    expect(String(tree.props.accessibilityLabel)).toContain('Caleb no ha pegado nada hoy');
  });

  it('el estado cerrado invita a abrir la app', () => {
    const { light } = renderWidget('Countdown', MODELS.cerrado, SIZES[0]) as {
      light: React.JSX.Element;
    };
    const tree = buildWidgetTree(light) as { props: Record<string, unknown> };
    expect(String(tree.props.accessibilityLabel)).toContain('Abre la app para empezar');
  });
});

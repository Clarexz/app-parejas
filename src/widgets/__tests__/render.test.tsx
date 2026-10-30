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
  now: NOW,
});

const MODELS: Record<string, WidgetModel> = {
  ready: widgetModel(ready, NOW),
  sinMood: widgetModel({ ...ready, partnerMood: null }, NOW),
  sinAniversario: widgetModel({ ...ready, anniversary: null, me: null, partner: null }, NOW),
  porEmpezar: widgetModel({ ...ready, anniversary: '2026-11-12' }, NOW),
  cerrado: widgetModel(emptyWidgetSnapshot('signed_out', NOW), NOW),
  sinPareja: widgetModel(emptyWidgetSnapshot('no_couple', NOW), NOW),
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

  it('el estado cerrado invita a abrir la app', () => {
    const { light } = renderWidget('Countdown', MODELS.cerrado, SIZES[0]) as {
      light: React.JSX.Element;
    };
    const tree = buildWidgetTree(light) as { props: Record<string, unknown> };
    expect(String(tree.props.accessibilityLabel)).toContain('Abre la app para empezar');
  });
});

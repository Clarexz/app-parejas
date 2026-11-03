import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';

import { TabBar, TAB_ICONS, type TabBarProps } from '../TabBar';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
}));

const ROUTES = [
  { name: 'index', title: 'Inicio' },
  { name: 'questions', title: 'Pregunta' },
  { name: 'stories', title: 'Stories' },
  { name: 'memories', title: 'Memorias' },
  { name: 'more', title: 'Más' },
];

function makeProps(index: number) {
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const navigateToTab = jest.fn();
  const routes = ROUTES.map((r) => ({ key: `${r.name}-1`, name: r.name }));
  const descriptors = Object.fromEntries(
    ROUTES.map((r) => [`${r.name}-1`, { options: { title: r.title } }]),
  );
  const props = {
    state: { index, routes },
    descriptors,
    emitter: { emit },
    navigateToTab,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as TabBarProps;
  return { props, navigateToTab };
}

const wrap = (props: TabBarProps) =>
  render(
    <ThemeProvider>
      <TabBar {...props} />
    </ThemeProvider>,
  );

describe('TabBar (ahorita)', () => {
  it('tiene 5 pestañas, solo ícono, cada una con su accessibilityLabel', async () => {
    const { props } = makeProps(0);
    await wrap(props);
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    for (const { title } of ROUTES) {
      expect(screen.getByLabelText(title)).toBeTruthy();
      // Sin texto visible: el nombre vive solo en la etiqueta de accesibilidad.
      expect(screen.queryByText(title)).toBeNull();
    }
  });

  it('solo la pestaña activa está seleccionada', async () => {
    const { props } = makeProps(2);
    await wrap(props);
    const selected = screen.getAllByRole('tab').filter((t) => t.props.accessibilityState.selected);
    expect(selected).toHaveLength(1);
    expect(screen.getByLabelText('Stories').props.accessibilityState.selected).toBe(true);
  });

  it('navega a otra pestaña pero no a la activa', async () => {
    const { props, navigateToTab } = makeProps(0);
    await wrap(props);
    await fireEvent.press(screen.getByLabelText('Inicio'));
    expect(navigateToTab).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Memorias'));
    expect(navigateToTab).toHaveBeenCalledWith('memories-1');
  });

  it('usa los íconos del manual', () => {
    expect(TAB_ICONS).toEqual({
      index: 'home',
      questions: 'question',
      stories: 'stories',
      memories: 'memories',
      more: 'more',
    });
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components';
import { ThemeProvider } from '@/theme';

import { AddQuestionForm } from '../AddQuestionForm';
import { CustomQuestionList } from '../CustomQuestionList';

const mockAdd = jest.fn();
const mockRetire = jest.fn();
const mockPush = jest.fn();
let mockCustom: unknown[] = [];

jest.mock('expo-haptics', () => ({}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({ partner: { id: 'p', display_name: 'Caleb', nickname: null } }),
}));
jest.mock('../../hooks', () => ({
  useCategories: () => ({
    categories: [
      { slug: 'viajes', name: 'Viajes', emoji: '✈️', intensity: 'ligera' },
      { slug: 'picantes', name: 'Picantes', emoji: '🌶️', intensity: 'picante' },
    ],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useAddCustomQuestion: () => ({ mutateAsync: mockAdd, isPending: false }),
  useRetireCustomQuestion: () => ({ mutateAsync: mockRetire, isPending: false }),
  useCustomQuestions: () => ({
    questions: mockCustom,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>,
  );

describe('AddQuestionForm', () => {
  beforeEach(() => {
    mockAdd.mockReset();
    mockCustom = [];
  });

  it('no deja agregar hasta que todo es válido y manda el texto normalizado', async () => {
    mockAdd.mockResolvedValue('id');
    await wrap(<AddQuestionForm spicyActive={false} />);
    const submit = screen.getByRole('button', { name: 'Agregar pregunta' });
    expect(submit.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: '✈️ Viajes' }));
    await fireEvent.changeText(
      screen.getByLabelText('Texto de la pregunta'),
      '  ¿A dónde   nos escapamos?  ',
    );
    expect(
      screen.getByRole('button', { name: 'Agregar pregunta' }).props.accessibilityState.disabled,
    ).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar pregunta' }));
    await waitFor(() => expect(mockAdd).toHaveBeenCalled());
    expect(mockAdd).toHaveBeenCalledWith({
      category: 'viajes',
      type: 'open',
      text: '¿A dónde nos escapamos?',
      options: null,
      intensity: 'ligera',
    });
  });

  it('con opciones pide 2 y deja agregar o quitar hasta 4', async () => {
    await wrap(<AddQuestionForm spicyActive={false} />);
    await fireEvent.press(screen.getByRole('button', { name: '✈️ Viajes' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Con opciones' }));
    await fireEvent.changeText(screen.getByLabelText('Texto de la pregunta'), '¿Playa o monte?');
    expect(screen.getByLabelText('Opción 2')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Opción 1'), 'Playa');
    expect(screen.getByText('Pon al menos 2 opciones.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Opción 2'), 'Monte');
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar opción' }));
    expect(screen.getByLabelText('Opción 3')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Quitar la opción 3' }));
    expect(screen.queryByLabelText('Opción 3')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Agregar pregunta' }).props.accessibilityState.disabled,
    ).toBe(false);
  });

  it('las picantes solo aparecen si están activas', async () => {
    await wrap(<AddQuestionForm spicyActive={false} />);
    expect(screen.queryByRole('button', { name: '🌶️ Picantes' })).toBeNull();
    await wrap(<AddQuestionForm spicyActive />);
    expect(screen.getByRole('button', { name: '🌶️ Picantes' })).toBeTruthy();
  });

  it('muestra el error del servidor en español', async () => {
    mockAdd.mockRejectedValue({ code: 'P0001', message: 'duplicate_question' });
    await wrap(<AddQuestionForm spicyActive={false} />);
    await fireEvent.press(screen.getByRole('button', { name: '✈️ Viajes' }));
    await fireEvent.changeText(screen.getByLabelText('Texto de la pregunta'), '¿Playa o monte?');
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar pregunta' }));
    expect(await screen.findByText('Esa pregunta ya existe.')).toBeTruthy();
  });
});

describe('CustomQuestionList', () => {
  const q = {
    id: 'x1',
    category: 'viajes',
    category_name: 'Viajes',
    category_emoji: '✈️',
    type: 'open',
    text: '¿Y si nos vamos a Oaxaca?',
    options: null,
    intensity: 'ligera',
    created_by: 'u1',
    created_at: '',
    answered_by_me: false,
    answered_by_partner: true,
  };
  beforeEach(() => {
    mockRetire.mockReset();
    mockPush.mockClear();
  });

  it('sin preguntas invita a agregar la primera', async () => {
    mockCustom = [];
    await wrap(<CustomQuestionList />);
    expect(screen.getByText(/¿Cuál sería la primera\?/)).toBeTruthy();
  });

  it('abre la pregunta para contestarla', async () => {
    mockCustom = [q];
    await wrap(<CustomQuestionList />);
    expect(screen.getByText('Caleb contestó. Te toca.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Contestar' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/question', params: { id: 'x1' } });
  });

  it('retira con confirmación', async () => {
    mockCustom = [q];
    mockRetire.mockResolvedValue(undefined);
    await wrap(<CustomQuestionList />);
    await fireEvent.press(screen.getByRole('button', { name: 'Retirar' }));
    expect(mockRetire).not.toHaveBeenCalled();
    expect(screen.getByText('¿Retirar esta pregunta?')).toBeTruthy();
    const buttons = screen.getAllByRole('button', { name: 'Retirar' });
    await fireEvent.press(buttons[buttons.length - 1]);
    await waitFor(() => expect(mockRetire).toHaveBeenCalledWith('x1'));
  });
});

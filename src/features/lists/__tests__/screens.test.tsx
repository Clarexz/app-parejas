import 'react-native-gesture-handler/jestSetup';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '@/components/Toast';
import { ThemeProvider } from '@/theme';

import ListsScreen from '../../../app/lists/index';
import type { List, ListItem } from '../api';
import { ListDetail } from '../components/ListDetail';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => true,
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    couple: { id: 'c1' },
    me: { id: 'u1', display_name: 'Ale', nickname: null },
    partner: { id: 'u2', display_name: 'Caleb', nickname: null },
  }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const list = (id: string, title: string, extra: Partial<List> = {}): List => ({
  id,
  couple_id: 'c1',
  created_by: 'u1',
  kind: 'groceries',
  title,
  emoji: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  itemCount: 4,
  doneCount: 1,
  ...extra,
});

const item = (id: string, position: number, extra: Partial<ListItem> = {}): ListItem => ({
  id,
  couple_id: 'c1',
  created_by: 'u1',
  done_by: null,
  list_id: 'l1',
  text: `Renglón ${id}`,
  done: false,
  done_at: null,
  position,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  ...extra,
});

let mockLists = {
  lists: [] as List[],
  isLoading: false,
  isError: false,
  isRefetching: false,
  refetch: jest.fn(),
};
let mockOne = {
  list: null as List | null,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
let mockItems = {
  items: [] as ListItem[],
  isLoading: false,
  isError: false,
  isRefetching: false,
  refetch: jest.fn(),
};
const mockAdd = jest.fn();
const mockToggle = jest.fn();
const mockReorder = jest.fn();
const mockClear = jest.fn();
const mockUpdate = jest.fn();
const mockRemoveItem = jest.fn();
const mockRemoveList = jest.fn();
jest.mock('../hooks', () => ({
  useLists: () => mockLists,
  useList: () => mockOne,
  useListItems: () => mockItems,
  useListsRealtime: jest.fn(),
  useSaveList: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteList: () => ({ mutate: mockRemoveList }),
  useAddListItem: () => ({ mutate: mockAdd }),
  useToggleListItem: () => ({ mutate: mockToggle }),
  useUpdateListItem: () => ({ mutate: mockUpdate }),
  useDeleteListItem: () => ({ mutate: mockRemoveItem }),
  useClearDoneListItems: () => ({ mutate: mockClear, isPending: false }),
  useReorderListItems: () => ({ mutate: mockReorder }),
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <GestureHandlerRootView>
      <ThemeProvider>
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockLists = {
    lists: [],
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  };
  mockOne = { list: list('l1', 'Súper'), isLoading: false, isError: false, refetch: jest.fn() };
  mockItems = {
    items: [],
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  };
});

describe('pantalla Listas', () => {
  it('vacía: invita a crear la primera', async () => {
    await wrap(<ListsScreen />);
    expect(screen.getByText('Aquí todavía no hay nada apuntado')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear una lista' })).toBeTruthy();
  });

  it('error: permite reintentar', async () => {
    mockLists.isError = true;
    await wrap(<ListsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockLists.refetch).toHaveBeenCalled();
  });

  it('muestra tipo y avance, y abre la lista', async () => {
    mockLists.lists = [list('l1', 'Súper'), list('l2', 'Oaxaca', { kind: 'trip', emoji: '✈️' })];
    await wrap(<ListsScreen />);
    expect(screen.getByText('Súper · 1 de 4')).toBeTruthy();
    expect(screen.getByText('Viaje · 1 de 4')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Súper, Súper, 1 de 4' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/lists/[id]', params: { id: 'l1' } });
  });
});

describe('detalle de lista', () => {
  it('no encontrada', async () => {
    mockOne.list = null;
    await wrap(<ListDetail id="x" />);
    expect(screen.getByText('Esa lista ya no está')).toBeTruthy();
  });

  it('tacha un renglón, pendientes primero y quién lo tachó', async () => {
    mockItems.items = [
      item('a', 0, { text: 'Leche' }),
      item('b', 1, { text: 'Pan', done: true, done_by: 'u2', done_at: '2026-10-30T10:00:00Z' }),
    ];
    await wrap(<ListDetail id="l1" />);
    expect(screen.getByText('Lo tachó Caleb')).toBeTruthy();
    expect(screen.getByText('1 de 2')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Tachar: Leche' }));
    expect(mockToggle).toHaveBeenCalledWith(
      { listId: 'l1', id: 'a', done: true },
      expect.any(Object),
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Destachar: Pan' }));
    expect(mockToggle).toHaveBeenLastCalledWith(
      { listId: 'l1', id: 'b', done: false },
      expect.any(Object),
    );
  });

  it('agrega renglones seguidos y limpia el campo', async () => {
    mockItems.items = [item('a', 0)];
    await wrap(<ListDetail id="l1" />);
    const input = screen.getByLabelText('Agregar un renglón', { selector: 'TextInput' } as never);
    await fireEvent.changeText(input, 'Jitomates');
    await fireEvent(input, 'submitEditing');
    expect(mockAdd).toHaveBeenCalledWith({ listId: 'l1', text: 'Jitomates' }, expect.any(Object));
    await fireEvent.changeText(input, 'Cilantro');
    await fireEvent(input, 'submitEditing');
    expect(mockAdd).toHaveBeenCalledTimes(2);
  });

  it('no agrega renglones vacíos', async () => {
    await wrap(<ListDetail id="l1" />);
    const input = screen.getByLabelText('Agregar un renglón', { selector: 'TextInput' } as never);
    await fireEvent.changeText(input, '   ');
    await fireEvent(input, 'submitEditing');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('acomoda con las flechas mandando TODOS los ids', async () => {
    mockItems.items = [
      item('a', 0, { text: 'Uno' }),
      item('b', 1, { text: 'Dos' }),
      item('c', 2, { text: 'Tres', done: true, done_by: 'u1' }),
    ];
    await wrap(<ListDetail id="l1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Acomodar los renglones' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Subir: Dos' }));
    expect(mockReorder).toHaveBeenCalledWith(
      { listId: 'l1', ids: ['b', 'a', 'c'] },
      expect.any(Object),
    );
  });

  it('borra los tachados', async () => {
    mockItems.items = [item('a', 0, { done: true, done_by: 'u1' })];
    await wrap(<ListDetail id="l1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Borrar los tachados' }));
    expect(mockClear).toHaveBeenCalledWith('l1', expect.any(Object));
  });

  it('arrancar la lista pide confirmación', async () => {
    await wrap(<ListDetail id="l1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Arrancar esta lista' }));
    expect(mockRemoveList).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Arrancarla' }));
    expect(mockRemoveList).toHaveBeenCalledWith('l1', expect.any(Object));
    expect(mockBack).toHaveBeenCalled();
  });
});

import 'react-native-gesture-handler/jestSetup';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '@/components/Toast';
import { ThemeProvider } from '@/theme';

import MemoriesScreen from '../../../app/(tabs)/memories';
import { memoryWhen } from '../ago';
import type { Memory } from '../api';
import { MemoryDetail } from '../components/MemoryDetail';
import { MemoryEditor } from '../components/MemoryEditor';
import { OnThisDayCardView } from '../components/OnThisDayCard';
import { PaperMap } from '../components/PaperMap';
import { toPoints } from '../components/mapShared';

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
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    couple: { id: 'c1', timezone: 'America/Mexico_City' },
    me: { id: 'u1', display_name: 'Ale', nickname: null, avatar_path: null },
    partner: { id: 'u2', display_name: 'Caleb', nickname: null, avatar_path: null },
  }),
  useToday: () => ({ today: '2026-10-31', timeZone: 'America/Mexico_City' }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const memory = (id: string, title: string, extra: Partial<Memory> = {}): Memory => ({
  id,
  couple_id: 'c1',
  created_by: 'u2',
  title,
  body: 'Un día padrísimo',
  happened_on: '2026-08-14',
  lat: null,
  lng: null,
  place_name: null,
  created_at: '2026-08-15T10:00:00Z',
  updated_at: '2026-08-15T10:00:00Z',
  photos: [
    {
      id: `p-${id}`,
      couple_id: 'c1',
      memory_id: id,
      path: `c1/u2/${id}.jpg`,
      thumb_path: `c1/u2/${id}_thumb.jpg`,
      position: 0,
      width: 1200,
      height: 1600,
      created_at: '2026-08-15T10:00:00Z',
    },
  ],
  ...extra,
});

let mockList = {
  memories: [] as Memory[],
  isLoading: false,
  isError: false,
  isRefetching: false,
  refetch: jest.fn(),
};
let mockOne = {
  memory: null as Memory | null,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
const mockSave = jest.fn();
const mockRemove = jest.fn();
const mockDownload = jest.fn();
jest.mock('../hooks', () => ({
  useMemories: () => mockList,
  useMemory: () => mockOne,
  useMemoryPhotoUrls: () => ({ urls: {}, isLoading: false, isError: false }),
  useSaveMemory: () => ({ mutate: mockSave, isPending: false }),
  useDeleteMemory: () => ({ mutate: mockRemove }),
  useSaveMemoryPhoto: () => ({ mutate: mockDownload, isPending: false }),
  useOnThisDay: () => ({ items: [], isLoading: false }),
  useMemoriesRealtime: jest.fn(),
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
  mockList = {
    memories: [],
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  };
  mockOne = { memory: null, isLoading: false, isError: false, refetch: jest.fn() };
});

describe('pestaña Memorias', () => {
  it('vacía: copy con humor y botón para pegar la primera', async () => {
    await wrap(<MemoriesScreen />);
    expect(
      screen.getByText(
        'Todavía no pegan ninguna foto. La primera siempre sale chueca, y está bien.',
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Pegar una memoria' }));
    expect(mockPush).toHaveBeenCalledWith('/memory/edit');
  });

  it('error: permite reintentar', async () => {
    mockList.isError = true;
    await wrap(<MemoriesScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockList.refetch).toHaveBeenCalled();
  });

  it('agrupa por mes con sello y abre la memoria', async () => {
    mockList.memories = [
      memory('m1', 'Atardecer en Mazunte'),
      memory('m2', 'Tacos', { happened_on: '2026-10-03' }),
    ];
    await wrap(<MemoriesScreen />);
    expect(screen.getByText('AGOSTO 2026')).toBeTruthy();
    expect(screen.getByText('OCTUBRE 2026')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: /^Atardecer en Mazunte, 14 de agosto/ }),
    );
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/memory/[id]', params: { id: 'm1' } });
  });

  it('en el mapa avisa cuántas no tienen lugar', async () => {
    mockList.memories = [
      memory('m1', 'Con pin', { lat: 19.4, lng: -99.1 }),
      memory('m2', 'Sin pin'),
    ];
    await wrap(<MemoriesScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mapa' }));
    expect(screen.getByText(/1 memoria sin lugar/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Memoria: Con pin' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/memory/[id]', params: { id: 'm1' } });
  });
});

describe('mapa de papel', () => {
  it('un grupo de pines cercanos muestra su contador', async () => {
    const points = toPoints([
      memory('a', 'A', { lat: 19.41, lng: -99.17 }),
      memory('b', 'B', { lat: 19.42, lng: -99.171 }),
      memory('c', 'C', { lat: 15.66, lng: -96.55 }),
    ]);
    await wrap(<PaperMap points={points} onOpen={jest.fn()} />);
    expect(screen.getByRole('button', { name: '2 memorias en este lugar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Memoria: C' })).toBeTruthy();
  });
});

describe('detalle de memoria', () => {
  it('no encontrada', async () => {
    await wrap(<MemoryDetail id="x" />);
    expect(screen.getByText('Esa hoja ya no está')).toBeTruthy();
  });

  it('muestra fecha, título, texto, lugar y autor', async () => {
    mockOne.memory = memory('m1', 'Atardecer en Mazunte', {
      place_name: 'Playa Mazunte',
      lat: 15.66,
      lng: -96.55,
    });
    await wrap(<MemoryDetail id="m1" />);
    expect(screen.getByText('Atardecer en Mazunte')).toBeTruthy();
    expect(screen.getByText('Un día padrísimo')).toBeTruthy();
    expect(screen.getByText('Playa Mazunte')).toBeTruthy();
    expect(screen.getByText('hace 2 meses')).toBeTruthy();
    expect(screen.getByText('Pegada por Caleb.')).toBeTruthy();
  });

  it('arrancar pide confirmación y borra', async () => {
    mockOne.memory = memory('m1', 'Tacos');
    await wrap(<MemoryDetail id="m1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Arrancar esta hoja' }));
    expect(screen.getByText('¿Arrancar esta hoja?')).toBeTruthy();
    expect(mockRemove).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Arrancarla' }));
    expect(mockRemove).toHaveBeenCalledWith('m1', expect.anything());
    expect(mockBack).toHaveBeenCalled();
  });

  it('descargar manda la foto actual y explica si no hay permiso', async () => {
    mockOne.memory = memory('m1', 'Tacos');
    mockDownload.mockImplementation((_path, opts) => opts.onSuccess('denied'));
    await wrap(<MemoryDetail id="m1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Descargar esta foto' }));
    expect(mockDownload).toHaveBeenCalledWith('c1/u2/m1.jpg', expect.anything());
    expect(await screen.findByText(/necesitamos permiso de fotos/)).toBeTruthy();
  });
});

describe('editor de memoria', () => {
  it('sin foto ni título marca los errores y no guarda', async () => {
    await wrap(<MemoryEditor />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pegar memoria' }));
    expect(screen.getByText('Pega al menos una foto.')).toBeTruthy();
    expect(screen.getByText('Ponle un título a la memoria.')).toBeTruthy();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('al editar carga los campos, quita una foto y guarda con id', async () => {
    mockOne.memory = memory('m1', 'Tacos', {
      photos: [
        ...memory('m1', 'x').photos,
        {
          ...memory('m1', 'x').photos[0],
          id: 'p2',
          path: 'c1/u2/two.jpg',
          thumb_path: 'c1/u2/two_t.jpg',
          position: 1,
        },
      ],
    });
    await wrap(<MemoryEditor id="m1" />);
    expect(screen.getByDisplayValue('Tacos')).toBeTruthy();
    expect(screen.getByText('2/10')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Quitar la foto 2' }));
    expect(screen.getByText('1/10')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(mockSave).toHaveBeenCalledTimes(1);
    const vars = mockSave.mock.calls[0][0];
    expect(vars.id).toBe('m1');
    expect(vars.happenedOn).toBe('2026-08-14');
    expect(vars.photos).toHaveLength(1);
  });

  it('cerrar con cambios pregunta si tirar la hoja', async () => {
    await wrap(<MemoryEditor />);
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Algo');
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.getByText('¿Tirar esta hoja?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Tirarla' }));
    expect(mockBack).toHaveBeenCalled();
  });
});

describe('Un día como hoy', () => {
  it('muestra la etiqueta y abre la memoria', async () => {
    const onPress = jest.fn();
    await wrap(
      <OnThisDayCardView
        memory={memory('m1', 'Teotihuacán')}
        yearsAgo={2}
        extra={1}
        onPress={onPress}
      />,
    );
    expect(screen.getByText('Un día como hoy, hace 2 años')).toBeTruthy();
    expect(screen.getByText('y 1 memoria más ese día')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Un día como hoy, hace 2 años: Teotihuacán' }),
    );
    expect(onPress).toHaveBeenCalled();
  });
});

describe('memoryWhen', () => {
  it('años, meses, días', () => {
    expect(memoryWhen('2024-10-31', '2026-10-31')).toBe('hace 2 años');
    expect(memoryWhen('2025-11-01', '2026-10-31')).toBe('hace 11 meses');
    expect(memoryWhen('2026-10-26', '2026-10-31')).toBe('hace 5 días');
    expect(memoryWhen('2026-10-30', '2026-10-31')).toBe('ayer');
    expect(memoryWhen('2026-10-31', '2026-10-31')).toBe('hoy');
    expect(memoryWhen('2026-11-05', '2026-10-31')).toBe('');
  });
});

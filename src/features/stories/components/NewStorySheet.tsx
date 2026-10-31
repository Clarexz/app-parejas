import { useRouter } from 'expo-router';

import { ListRow, Sheet } from '@/components';

type Props = { visible: boolean; onClose: () => void };

/** "Pegar una story": elige de dónde sale (cámara, galería, texto o dibujo). */
export function NewStorySheet({ visible, onClose }: Props) {
  const router = useRouter();
  const go = (kind: 'camera' | 'library' | 'text' | 'drawing') => {
    onClose();
    router.push({ pathname: '/story/new', params: { kind } });
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Pegar una story">
      <ListRow label="Tomar foto" icon="camera" onPress={() => go('camera')} />
      <ListRow label="Elegir de la galería" icon="photo" onPress={() => go('library')} />
      <ListRow label="Escribir algo" icon="type" onPress={() => go('text')} />
      <ListRow label="Dibujar" icon="pencil" onPress={() => go('drawing')} divider={false} />
    </Sheet>
  );
}

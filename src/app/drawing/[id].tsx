import { useLocalSearchParams } from 'expo-router';

import { DrawingView } from '@/features/games';

export default function DrawingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DrawingView id={id} />;
}

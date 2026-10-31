import { useLocalSearchParams } from 'expo-router';

import { GameRoundView } from '@/features/games';

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GameRoundView id={id} />;
}

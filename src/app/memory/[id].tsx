import { useLocalSearchParams } from 'expo-router';

import { MemoryDetail } from '@/features/memories';

export default function MemoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MemoryDetail id={Array.isArray(id) ? id[0] : id} />;
}

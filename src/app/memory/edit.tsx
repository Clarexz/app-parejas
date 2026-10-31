import { useLocalSearchParams } from 'expo-router';

import { MemoryEditor } from '@/features/memories';

export default function EditMemoryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const memoryId = Array.isArray(id) ? id[0] : id;
  return <MemoryEditor id={memoryId || undefined} />;
}

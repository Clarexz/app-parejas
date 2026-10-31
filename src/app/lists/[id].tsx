import { useLocalSearchParams } from 'expo-router';

import { ListDetail } from '@/features/lists';

export default function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ListDetail id={Array.isArray(id) ? id[0] : id} />;
}

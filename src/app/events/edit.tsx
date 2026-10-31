import { useLocalSearchParams } from 'expo-router';

import { EventEditor } from '@/features/events';

export default function EditEventScreen() {
  const { id, kind } = useLocalSearchParams<{ id?: string; kind?: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const eventKind = Array.isArray(kind) ? kind[0] : kind;
  return <EventEditor id={eventId || undefined} kind={eventKind || undefined} />;
}

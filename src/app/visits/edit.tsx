import { useLocalSearchParams } from 'expo-router';

import { VisitEditor } from '@/features/visits';

export default function EditVisitRoute() {
  const { id, eventId } = useLocalSearchParams<{ id?: string; eventId?: string }>();
  const visitId = Array.isArray(id) ? id[0] : id;
  const fromEvent = Array.isArray(eventId) ? eventId[0] : eventId;
  return <VisitEditor id={visitId || undefined} eventId={fromEvent || undefined} />;
}

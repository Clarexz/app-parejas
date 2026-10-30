import { EmptyState, PageHeader, PencilNote, Screen } from '@/components';
import { useToday } from '@/features/couple';
import { formatStampIsoDate } from '@/lib/stampDate';

export default function QuestionsScreen() {
  const { today } = useToday();
  return (
    <Screen scroll>
      <PageHeader stamp={formatStampIsoDate(today)} title="Preguntas" />
      <EmptyState
        illustration={<PencilNote />}
        title="Aquí van a platicar"
        body="En la próxima versión llega la pregunta del día: cada quien contesta por su lado, se ve la racha de ustedes y pueden comentarse las respuestas. Por ahora, vayan afilando el lápiz."
      />
    </Screen>
  );
}

import { EmptyPolaroid, EmptyState, PageHeader, Screen } from '@/components';
import { useToday } from '@/features/couple';
import { formatStampIsoDate } from '@/lib/stampDate';

export default function StoriesScreen() {
  const { today } = useToday();
  return (
    <Screen scroll>
      <PageHeader stamp={formatStampIsoDate(today)} title="Stories" />
      <EmptyState
        illustration={<EmptyPolaroid />}
        title="Fotos de un día"
        body="Pronto podrán pegar fotos que duran 24 horas: lo que están viendo ahorita, sin tanta producción. Mientras, vayan cargando el celular."
      />
    </Screen>
  );
}

import { EmptyState, PageHeader, Polaroid, Scene, Screen } from '@/components';
import { useToday } from '@/features/couple';
import { formatStampIsoDate } from '@/lib/stampDate';

export default function MemoriesScreen() {
  const { today } = useToday();
  return (
    <Screen scroll>
      <PageHeader stamp={formatStampIsoDate(today)} title="Memorias" />
      <EmptyState
        illustration={
          <Polaroid size="S" tilt={0} caption="Algún día" accessibilityLabel="Una foto de ejemplo">
            <Scene kind="hill" />
          </Polaroid>
        }
        title="Su diario de fotos"
        body="Más adelante podrán guardar sus fotos con fecha y lugar, y verlas en un mapa. Por ahora, la libreta se está acomodando."
      />
    </Screen>
  );
}

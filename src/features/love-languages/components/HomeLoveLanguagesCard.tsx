import { View } from 'react-native';

import { Card, Text } from '@/components';
import { HomePrompt } from '@/features/home/components/HomePrompt';
import { homeLoveLanguages, type LoveLanguagesOverview } from '@/lib/loveLanguages';
import { useTheme } from '@/theme';

import { LOVE_QUIZ } from '../quiz';

type Props = {
  overview: LoveLanguagesOverview | null;
  partnerName: string;
  onOpen: () => void;
};

/** Lenguaje del amor principal de cada quien; si falta alguien, invita al test. */
export function HomeLoveLanguagesCard({ overview, partnerName, onOpen }: Props) {
  const { spacing } = useTheme();
  const view = homeLoveLanguages(overview, LOVE_QUIZ.languages);

  if (view.state === 'none') {
    return <HomePrompt icon="love" text="Descubran su lenguaje del amor" onPress={onOpen} />;
  }
  if (view.state === 'only_partner') {
    return (
      <HomePrompt
        icon="love"
        text={`${partnerName} ya hizo el test. Haz el tuyo`}
        onPress={onOpen}
      />
    );
  }

  const columns = [
    { who: 'Tú', value: view.mine },
    { who: partnerName, value: view.partner ?? 'Aún sin test' },
  ];
  return (
    <Card
      onPress={onOpen}
      style={{ padding: 20, gap: spacing.sm }}
      accessibilityLabel={`Lenguaje del amor. ${columns.map((c) => `${c.who}: ${c.value}`).join('. ')}. Toca para ver el detalle.`}
    >
      <Text variant="label" tone="muted">
        Lenguaje del amor
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
        {columns.map((c) => (
          <View key={c.who} style={{ flex: 1, gap: spacing.xxs }}>
            <Text variant="note" tone="muted" numberOfLines={1}>
              {c.who}
            </Text>
            <Text variant="ui">{c.value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

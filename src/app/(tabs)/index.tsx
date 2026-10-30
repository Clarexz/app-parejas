import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button, PageHeader, Screen, Text } from '@/components';
import { useCouple, useToday } from '@/features/couple';
import { DaysTogether, HomePlaceholders, PersonPolaroid, UpcomingList } from '@/features/home';
import { MoodSheet, useMoodRealtime, useMoods } from '@/features/mood';
import { useQuestionsRealtime } from '@/features/questions';
import { haptic } from '@/lib/haptics';
import { homeSummary } from '@/lib/home';
import { formatStampIsoDate } from '@/lib/stampDate';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { couple, me, partner, refetch: refetchCouple } = useCouple();
  const { today } = useToday();
  const { latestByUser, isLoading, isError, refetch: refetchMoods } = useMoods();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [partnerPulse, setPartnerPulse] = useState(0);

  useMoodRealtime(couple?.id ?? null, () => {
    setPartnerPulse((n) => n + 1);
    haptic.stick();
  });

  useQuestionsRealtime(couple?.id ?? null);

  const anniversary = couple?.anniversary_date ?? null;
  const summary = useMemo(() => homeSummary(anniversary, today), [anniversary, today]);

  const myMood = (me && latestByUser[me.id]) || null;
  const partnerMood = (partner && latestByUser[partner.id]) || null;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchCouple(), refetchMoods()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchCouple, refetchMoods]);

  return (
    <Screen scroll refreshing={refreshing} onRefresh={refresh}>
      <View style={{ gap: spacing.xl }}>
        <PageHeader stamp={formatStampIsoDate(today)} title="Ustedes dos" />

        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.md, paddingTop: spacing.md }}>
            <PersonPolaroid
              profile={me}
              fallback="Tú"
              tape="yellow"
              mood={myMood}
              moodsLoading={isLoading}
              onPress={() => setSheetOpen(true)}
            />
            <PersonPolaroid
              profile={partner}
              fallback="Tu pareja"
              tape="mint"
              mood={partnerMood}
              moodsLoading={isLoading}
              pulse={partnerPulse}
            />
          </View>
          {isError ? (
            <Text variant="small" tone="chile" accessibilityLiveRegion="polite">
              No pudimos traer los moods. Desliza hacia abajo para reintentar.
            </Text>
          ) : null}
          <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
            <Button
              title="Ver cómo han andado"
              variant="ghost"
              onPress={() => router.push('/moods')}
            />
          </View>
        </View>

        <DaysTogether summary={summary} anniversary={anniversary} />

        {summary.state === 'counting' ? <UpcomingList items={summary.upcoming} /> : null}

        <HomePlaceholders />
      </View>
      <MoodSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} current={myMood} />
    </Screen>
  );
}

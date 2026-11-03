import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button, Notice, Screen, SoftAskNote } from '@/components';
import { useCouple, useFruits, useToday } from '@/features/couple';
import { EventsEvents, useCountdowns } from '@/features/events';
import {
  HomeHeader,
  HomeQuestionCard,
  NextTimeCard,
  PersonColumn,
  StatsRow,
  shortDate,
} from '@/features/home';
import { OnThisDayCard } from '@/features/memories';
import { MoodSheet, useMoodRealtime, useMoods } from '@/features/mood';
import { usePushSoftAsk } from '@/features/notifications';
import { groupActive, useActiveStories } from '@/features/stories';
import { UpdateNotice } from '@/features/updates';
import { FRUITS } from '@/lib/fruits';
import { haptic } from '@/lib/haptics';
import { homeSummary } from '@/lib/home';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { couple, me, partner, refetch: refetchCouple } = useCouple();
  const { today } = useToday();
  const fruits = useFruits();
  const { latestByUser, isLoading, isError, refetch: refetchMoods } = useMoods();
  const { stories, refetch: refetchStories } = useActiveStories();
  const softAsk = usePushSoftAsk();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [partnerPulse, setPartnerPulse] = useState(0);

  useMoodRealtime(couple?.id ?? null, () => {
    setPartnerPulse((n) => n + 1);
    haptic.light();
  });

  const anniversary = couple?.anniversary_date ?? null;
  const summary = useMemo(() => homeSummary(anniversary, today), [anniversary, today]);
  const { refetch: refetchEvents } = useCountdowns();

  const myMood = (me && latestByUser[me.id]) || null;
  const partnerMood = (partner && latestByUser[partner.id]) || null;
  const groups = groupActive(stories, me?.id, partner?.id);
  const partnerFruit = fruits.partner ?? FRUITS[fruits.me.suggested];

  const openStories = (userId: string) =>
    router.push({ pathname: '/story/view', params: { user: userId } });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchCouple(), refetchMoods(), refetchEvents(), refetchStories()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchCouple, refetchMoods, refetchEvents, refetchStories]);

  return (
    <Screen scroll refreshing={refreshing} onRefresh={refresh}>
      <EventsEvents />
      <View style={{ gap: spacing.xl }}>
        <HomeHeader date={shortDate(today)} />

        <UpdateNotice />

        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' }}>
            <PersonColumn
              profile={partner}
              fallback="Tu pareja"
              fruit={partnerFruit}
              mood={partnerMood}
              moodsLoading={isLoading}
              pulse={partnerPulse}
              newStory={groups.partnerUnseen > 0}
              onPressAvatar={
                partner && groups.partner.length > 0 ? () => openStories(partner.id) : undefined
              }
            />
            <PersonColumn
              profile={me}
              fallback="Tú"
              fruit={fruits.me}
              mood={myMood}
              moodsLoading={isLoading}
              onPressAvatar={() =>
                groups.mine.length > 0 && me ? openStories(me.id) : router.push('/stories')
              }
              onPressMood={() => setSheetOpen(true)}
            />
          </View>
          {isError ? (
            <Notice tone="danger">
              No pudimos traer los moods. Desliza hacia abajo para reintentar.
            </Notice>
          ) : null}
          <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
            <Button
              title="Ver cómo han andado"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/moods')}
            />
          </View>
        </View>

        <NextTimeCard />

        <View style={{ gap: spacing.md }}>
          <HomeQuestionCard />
          {softAsk.visible ? (
            <SoftAskNote
              partnerName={partner?.nickname || partner?.display_name}
              onAccept={() => void softAsk.accept()}
              onDismiss={softAsk.dismiss}
            />
          ) : null}
        </View>

        <StatsRow summary={summary} anniversary={anniversary} />

        <OnThisDayCard />
      </View>
      <MoodSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} current={myMood} />
    </Screen>
  );
}

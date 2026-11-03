import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  Avatar,
  EmptyState,
  LoadingSymbol,
  MoodBubble,
  Notice,
  Screen,
  ScreenHeader,
  Text,
  type FruitLike,
} from '@/components';
import { useCouple, useFruits, useToday } from '@/features/couple';
import { useMoods } from '@/features/mood';
import { dayTitle } from '@/features/mood/format';
import { useSignedUrl, type Profile } from '@/features/profile';
import { formatTimeIn, todayIn } from '@/lib/dates';
import { FRUITS } from '@/lib/fruits';
import { groupMoodsByDay, moodLabel } from '@/lib/mood';
import { useTheme } from '@/theme';

function displayName(profile: Profile | null, fallback: string): string {
  return profile?.nickname || profile?.display_name || fallback;
}

function MoodAvatar({
  profile,
  name,
  fruit,
}: {
  profile: Profile | null;
  name: string;
  fruit: FruitLike;
}) {
  const url = useSignedUrl(profile?.avatar_path);
  return <Avatar size={40} name={name} source={url ?? undefined} fruit={fruit} ring />;
}

export default function MoodsScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { me, partner, refetch: refetchCouple } = useCouple();
  const { today, timeZone } = useToday();
  const fruits = useFruits();
  const { moods, isLoading, isError, refetch } = useMoods();
  const [refreshing, setRefreshing] = useState(false);

  const groups = useMemo(
    () => groupMoodsByDay(moods, (ts) => todayIn(timeZone, new Date(ts))),
    [moods, timeZone],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchCouple(), refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchCouple, refetch]);

  const people = useMemo(() => {
    const map = new Map<string, { profile: Profile | null; name: string; fruit: FruitLike }>();
    if (me) map.set(me.id, { profile: me, name: displayName(me, 'Tú'), fruit: fruits.me });
    if (partner) {
      map.set(partner.id, {
        profile: partner,
        name: displayName(partner, 'Tu pareja'),
        fruit: fruits.partner ?? FRUITS[fruits.me.suggested],
      });
    }
    return map;
  }, [me, partner, fruits]);

  return (
    <Screen scroll refreshing={refreshing} onRefresh={refresh}>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader back title="Cómo han andado" />

        {isLoading ? (
          <View style={{ paddingVertical: spacing.xxxl }}>
            <LoadingSymbol accessibilityLabel="Cargando los moods" />
          </View>
        ) : isError ? (
          <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
            No pudimos traer los moods. Revisa tu internet y vuelve a intentar.
          </Notice>
        ) : groups.length === 0 ? (
          <EmptyState
            art="bubble"
            title="Aquí irá su primer mood"
            body="Toca tu burbuja en Inicio y cuéntale a tu pareja cómo estás."
            action={{ label: 'Ir a Inicio', onPress: () => router.navigate('/') }}
          />
        ) : (
          <View style={{ gap: spacing.xl }}>
            {groups.map((group) => (
              <View key={group.day} style={{ gap: spacing.md }}>
                <Text variant="h3" accessibilityRole="header">
                  {dayTitle(group.day, today)}
                </Text>
                {group.moods.map((mood) => {
                  const who = people.get(mood.user_id);
                  const name = who?.name ?? 'Alguien';
                  const fruit = who?.fruit ?? FRUITS.sandia;
                  const spoken = moodLabel(mood.emoji) ?? '';
                  const time = formatTimeIn(timeZone, new Date(mood.created_at));
                  return (
                    <View
                      key={mood.id}
                      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}
                    >
                      <View style={{ paddingTop: spacing.xs }}>
                        <MoodAvatar profile={who?.profile ?? null} name={name} fruit={fruit} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <MoodBubble
                          fruit={fruit}
                          emoji={mood.emoji}
                          mood={spoken}
                          note={[`${name} · ${time}`, mood.note].filter(Boolean).join('\n')}
                          accessibilityLabel={`${name}, ${spoken || mood.emoji}${mood.note ? `: ${mood.note}` : ''}, ${time}`}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

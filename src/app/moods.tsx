import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  Avatar,
  CloudOff,
  Divider,
  EmptyPolaroid,
  EmptyState,
  IconButton,
  LoadingLines,
  PageHeader,
  Screen,
  Stamp,
  Text,
} from '@/components';
import { useCouple, useToday } from '@/features/couple';
import { useMoods } from '@/features/mood';
import { useSignedUrl, type Profile } from '@/features/profile';
import { formatTimeIn, todayIn } from '@/lib/dates';
import { dayHeading } from '@/lib/home';
import { groupMoodsByDay } from '@/lib/mood';
import { formatStampIsoDate } from '@/lib/stampDate';
import { useTheme } from '@/theme';

function displayName(profile: Profile | null, fallback: string): string {
  return profile?.nickname || profile?.display_name || fallback;
}

function MoodAvatar({ profile, name }: { profile: Profile | null; name: string }) {
  const url = useSignedUrl(profile?.avatar_path);
  return <Avatar variant="round" size={32} name={name} source={url ?? undefined} />;
}

export default function MoodsScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { me, partner, refetch: refetchCouple } = useCouple();
  const { today, timeZone } = useToday();
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
    const map = new Map<string, { profile: Profile | null; name: string }>();
    if (me) map.set(me.id, { profile: me, name: displayName(me, 'Tú') });
    if (partner) map.set(partner.id, { profile: partner, name: displayName(partner, 'Tu pareja') });
    return map;
  }, [me, partner]);

  return (
    <Screen scroll refreshing={refreshing} onRefresh={refresh}>
      <View style={{ gap: spacing.lg }}>
        <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
          <IconButton name="back" accessibilityLabel="Volver" onPress={() => router.back()} />
        </View>
        <PageHeader stamp={formatStampIsoDate(today)} title="Así han andado" />

        {isLoading ? (
          <LoadingLines accessibilityLabel="Cargando los moods" />
        ) : isError ? (
          <EmptyState
            illustration={<CloudOff />}
            title="No pudimos traer los moods"
            body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
            actionLabel="Reintentar"
            onAction={() => void refetch()}
          />
        ) : groups.length === 0 ? (
          <EmptyState
            illustration={<EmptyPolaroid />}
            title="Todavía no hay moods"
            body="Toca tu foto en el Inicio y pega el primero."
          />
        ) : (
          <View style={{ gap: spacing.xl }}>
            {groups.map((group) => (
              <View key={group.day} style={{ gap: spacing.xs }}>
                <Stamp tone={group.day === today ? 'jamaica' : 'ink'}>
                  {dayHeading(group.day, today)}
                </Stamp>
                <View>
                  {group.moods.map((mood, i) => {
                    const who = people.get(mood.user_id);
                    const name = who?.name ?? 'Alguien';
                    return (
                      <View key={mood.id}>
                        {i > 0 ? <Divider /> : null}
                        <View
                          accessible
                          accessibilityLabel={`${name}, ${mood.emoji}${mood.note ? `: ${mood.note}` : ''}, ${formatTimeIn(timeZone, new Date(mood.created_at))}`}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: spacing.md,
                            paddingVertical: spacing.md,
                          }}
                        >
                          <MoodAvatar profile={who?.profile ?? null} name={name} />
                          <Text variant="display" style={{ minWidth: 44, textAlign: 'center' }}>
                            {mood.emoji}
                          </Text>
                          <View style={{ flex: 1, minWidth: 0, gap: spacing.xxs }}>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'baseline',
                                justifyContent: 'space-between',
                                gap: spacing.sm,
                              }}
                            >
                              <Text
                                variant="bodyStrong"
                                numberOfLines={1}
                                style={{ flexShrink: 1 }}
                              >
                                {name}
                              </Text>
                              <Text variant="mono" tone="muted">
                                {formatTimeIn(timeZone, new Date(mood.created_at))}
                              </Text>
                            </View>
                            {mood.note ? <Text variant="hand">{mood.note}</Text> : null}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  CloudOff,
  Divider,
  Doodle,
  EmptyState,
  Icon,
  ListRow,
  LoadingLines,
  PageHeader,
  Screen,
  Sheet,
  Stamp,
  Text,
} from '@/components';
import { useCouple, useToday } from '@/features/couple';
import { useCategories, useDailyQuestion, useStreak } from '@/features/questions';
import { cardState, spicyState } from '@/lib/questions';
import { categoryColor, shortStamp, streakHeadline } from '@/lib/questionsView';
import { formatStampIsoDate } from '@/lib/stampDate';
import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

function TodayCard() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { partner } = useCouple();
  const { card } = useDailyQuestion();
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';
  const state = card ? cardState(card) : null;
  const status =
    state === 'both'
      ? 'Ya contestaron los dos.'
      : state === 'waiting'
        ? `Ya contestaste. Falta ${partnerName}.`
        : state === 'unanswered'
          ? card?.partner_answered
            ? `${partnerName} ya escribió. Te toca.`
            : 'Todavía no la contestas.'
          : null;
  return (
    <Card
      variant="ruled"
      tilt={tiltFor('today-question', 1)}
      onPress={() => router.push('/question')}
      accessibilityLabel="La pregunta de hoy"
    >
      <View style={{ gap: spacing.xs }}>
        <Text variant="hand" tone="jamaica">
          La pregunta de hoy
        </Text>
        {card ? (
          <Text variant="bodyStrong" numberOfLines={3}>
            {card.question.text}
          </Text>
        ) : (
          <Text variant="body" muted>
            Ábrela para ver qué les tocó hoy.
          </Text>
        )}
        {status ? (
          <Text variant="small" tone={state === 'both' ? 'nopal' : 'muted'}>
            {status}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

export default function QuestionsScreen() {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const { today } = useToday();
  const { me, members } = useCouple();
  const streak = useStreak();
  const categories = useCategories();
  const [spicySheet, setSpicySheet] = useState(false);

  const spicyActive = spicyState(members, me?.id ?? '').active;
  const refetchAll = () => {
    void streak.refetch();
    void categories.refetch();
  };
  const loading = streak.isLoading || categories.isLoading;
  const failed = streak.isError || categories.isError;

  return (
    <Screen
      scroll
      refreshing={streak.isRefetching || categories.isRefetching}
      onRefresh={refetchAll}
    >
      <PageHeader stamp={formatStampIsoDate(today)} title="Preguntas" />
      <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
        <TodayCard />

        {loading ? (
          <LoadingLines count={4} accessibilityLabel="Cargando las preguntas" />
        ) : failed ? (
          <EmptyState
            illustration={<CloudOff />}
            title="No pudimos abrir las preguntas"
            body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
            actionLabel="Reintentar"
            onAction={refetchAll}
          />
        ) : (
          <>
            {streak.streak ? (
              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
                  <View>
                    <Text variant="hero" accessibilityLabel={streakHeadline(streak.streak.current)}>
                      {streak.streak.current}
                    </Text>
                    <Doodle kind="underline" width={96} color={colors.cempasuchil} />
                  </View>
                  <View style={{ flex: 1, paddingBottom: spacing.sm, gap: spacing.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <Icon name="flame" size={20} color={colors.cempasuchil} />
                      <Text variant="hand">
                        {streak.streak.current === 1 ? 'día seguido' : 'días seguidos'}
                      </Text>
                    </View>
                    <Text variant="small" muted>
                      Récord: {streak.streak.best}
                    </Text>
                  </View>
                </View>
                {streak.streak.current === 0 ? (
                  <Text variant="body" muted>
                    {streakHeadline(0)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {streak.streak && streak.streak.missing_days.length > 0 ? (
              <View style={{ gap: spacing.md }}>
                <Text variant="title" accessibilityRole="header">
                  Reparar la racha
                </Text>
                <Text variant="body" muted>
                  Contesten los días que se les pasaron (hasta 7 atrás) y la racha se recupera.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {streak.streak.missing_days.map((day) => (
                    <Pressable
                      key={day}
                      accessibilityRole="button"
                      accessibilityLabel={`Contestar el ${formatStampIsoDate(day)}`}
                      onPress={() => router.push({ pathname: '/question', params: { day } })}
                      style={({ pressed }) => ({
                        minHeight: 44,
                        justifyContent: 'center',
                        paddingRight: spacing.xs,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Stamp tone="ink" rotate={-2 + tiltFor(day, 1)}>
                        {shortStamp(day)}
                      </Stamp>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ gap: spacing.sm }}>
              <Text variant="title" accessibilityRole="header">
                Categorías
              </Text>
              {categories.categories.length === 0 ? (
                <Text variant="body" muted>
                  Todavía no hay categorías. Jala hacia abajo para actualizar.
                </Text>
              ) : (
                <View>
                  {categories.categories.map((c, i) => {
                    const locked = c.intensity === 'picante' && !spicyActive;
                    return (
                      <View key={c.slug}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            locked ? `${c.name}, bloqueada` : `${c.name}. ${c.description}`
                          }
                          onPress={() =>
                            locked
                              ? setSpicySheet(true)
                              : router.push({
                                  pathname: '/category/[slug]',
                                  params: { slug: c.slug },
                                })
                          }
                          style={({ pressed }) => ({
                            minHeight: 64,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: spacing.md,
                            paddingVertical: spacing.md,
                            opacity: pressed ? 0.6 : 1,
                          })}
                        >
                          <View style={{ flex: 1, gap: spacing.xs }}>
                            <Chip label={c.name} color={categoryColor(c.slug, c.intensity)} />
                            <Text variant="small" muted>
                              {c.description}
                            </Text>
                          </View>
                          {locked ? (
                            <Icon name="lock" size={24} color={colors.inkMuted} />
                          ) : (
                            <View style={{ transform: [{ rotate: '180deg' }] }}>
                              <Icon name="back" size={20} color={colors.inkMuted} />
                            </View>
                          )}
                        </Pressable>
                        {i < categories.categories.length - 1 ? <Divider /> : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View>
              <Divider />
              <ListRow
                label="Historial"
                icon="list"
                onPress={() => router.push('/history')}
                divider={false}
              />
            </View>
          </>
        )}
      </View>

      <Sheet visible={spicySheet} onClose={() => setSpicySheet(false)} title="Todavía con candado">
        <View style={{ gap: spacing.md }}>
          <Text variant="body">
            Las preguntas picantes se abren solo cuando los dos quieren. Cada quien lo decide en su
            celular y cualquiera puede apagarlas después.
          </Text>
          <Button
            title="Ir al ajuste"
            onPress={() => {
              setSpicySheet(false);
              router.push('/settings/couple');
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import {
  Button,
  Card,
  FruitDot,
  Icon,
  LoadingSymbol,
  Notice,
  Screen,
  ScreenHeader,
  StatTile,
  Text,
} from '@/components';
import { useCouple, useFruits } from '@/features/couple';
import { useNames } from '@/features/games/components/useNames';
import { useLoveLanguages } from '@/features/love-languages';
import { LOVE_QUIZ } from '@/features/love-languages/quiz';
import { ShareCardButton } from '@/features/share';
import { useVisitStats, useVisits } from '@/features/visits';
import { formatNumber } from '@/lib/dates';
import { GAMES } from '@/lib/games';
import { primaryLabel, primaryLanguages } from '@/lib/loveLanguages';
import {
  bestMonth,
  bestMonthLine,
  bestStreakSentence,
  lastMonths,
  matchLine,
  plural,
  sharedLine,
  sinceLastVisitLine,
  sinceStamp,
  streakSentence,
  type RelationshipStats,
} from '@/lib/stats';
import { useTheme } from '@/theme';

import { useRelationshipStats } from '../hooks';
import { BarChart, MeterBar } from './Charts';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="h3" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Dos números lado a lado (rejilla de 2). */
function Pair({ children }: { children: ReactNode }) {
  const { spacing } = useTheme();
  return <View style={{ flexDirection: 'row', gap: spacing.md }}>{children}</View>;
}

function Empty({ children }: { children: string }) {
  return (
    <Text variant="body" tone="muted">
      {children}
    </Text>
  );
}

function QuestionsSection({ s }: { s: RelationshipStats['questions'] }) {
  const { spacing } = useTheme();
  const fruits = useFruits();
  const { partnerName } = useNames();
  const none = s.answeredMe + s.answeredPartner === 0;
  const most = Math.max(s.answeredMe, s.answeredPartner, 1);
  return (
    <Section title="Preguntas">
      {none ? (
        <Empty>Todavía no contestan ninguna pregunta. La de hoy es buen momento.</Empty>
      ) : (
        <>
          <Card>
            <View
              accessible
              accessibilityLabel={`${plural(s.dailyComplete, 'día', 'días')} que contestaron los dos`}
              style={{ gap: spacing.xs }}
            >
              <Text variant="display">{formatNumber(s.dailyComplete)}</Text>
              <Text variant="ui">
                {s.dailyComplete === 1 ? 'día contestaron los dos' : 'días contestaron los dos'}
              </Text>
            </View>
          </Card>
          <Card>
            <View style={{ gap: spacing.md }}>
              <MeterBar
                label="Contestadas por ti"
                value={s.answeredMe}
                max={most}
                color={fruits.me.hex}
                dot={<FruitDot fruit={fruits.me} />}
              />
              <MeterBar
                label={`Contestadas por ${partnerName}`}
                value={s.answeredPartner}
                max={most}
                color={(fruits.partner ?? fruits.me).hex}
                dot={<FruitDot fruit={fruits.partner ?? fruits.me} />}
              />
            </View>
          </Card>
          <Pair>
            <StatTile value={formatNumber(s.comments)} label="comentarios" icon="smile" />
            <View style={{ flex: 1 }} />
          </Pair>
        </>
      )}
    </Section>
  );
}

function StreakSection({ s }: { s: RelationshipStats['streak'] }) {
  const { spacing } = useTheme();
  return (
    <Section title="Racha">
      <Pair>
        <StatTile value={formatNumber(s.current)} label="días de racha" icon="flame" />
        <StatTile value={formatNumber(s.best)} label="días, su récord" icon="spark" />
      </Pair>
      <View style={{ gap: spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {s.current > 0 ? <Icon name="flame" size={20} /> : null}
          <Text variant="ui" style={{ flex: 1 }}>
            {streakSentence(s.current)}
          </Text>
        </View>
        <Text variant="note" tone="muted">
          {bestStreakSentence(s.best)}
        </Text>
      </View>
      {s.current > 0 ? (
        <View style={{ alignItems: 'flex-start' }}>
          <ShareCardButton kind="button" data={{ kind: 'streak', days: s.current }} />
        </View>
      ) : null}
    </Section>
  );
}

function GamesSection({
  s,
  drawings,
}: {
  s: RelationshipStats['games'];
  drawings: RelationshipStats['drawings'];
}) {
  const { spacing } = useTheme();
  const { colors } = useTheme();
  const line = matchLine(s.avgPct);
  return (
    <Section title="Juegos">
      {s.rounds === 0 ? (
        <Empty>Todavía no juegan ninguna ronda.</Empty>
      ) : (
        <>
          <Pair>
            <StatTile value={formatNumber(s.rounds)} label="rondas terminadas" icon="games" />
            {s.avgPct !== null ? (
              <StatTile value={`${s.avgPct} %`} label="coincidencia promedio" icon="couple" />
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </Pair>
          {line ? <Text variant="ui">{line}</Text> : null}
          {s.bestPct !== null ? (
            <Text variant="note" tone="muted">
              Su mejor ronda: {s.bestPct} %.
            </Text>
          ) : null}
          <View style={{ gap: spacing.md }}>
            {s.byGame.map((g) => (
              <MeterBar
                key={g.game}
                label={GAMES[g.game].name}
                value={g.avgPct ?? 0}
                max={100}
                color={colors.ink}
                trailing={`${plural(g.rounds, 'ronda', 'rondas')}${
                  g.avgPct !== null ? ` · ${g.avgPct} %` : ''
                }`}
                accessibilityLabel={`${GAMES[g.game].name}: ${plural(g.rounds, 'ronda', 'rondas')}${
                  g.avgPct !== null ? `, coinciden en ${g.avgPct} %` : ''
                }`}
              />
            ))}
          </View>
        </>
      )}
      <Text variant="note" tone="muted">
        {drawings.finished === 0
          ? 'Todavía no terminan ningún reto de dibujo.'
          : `Dibujos adivinados: ${formatNumber(drawings.solved)} de ${formatNumber(drawings.finished)}.`}
      </Text>
    </Section>
  );
}

function MemoriesSection({ s, today }: { s: RelationshipStats['memories']; today: string }) {
  const { spacing } = useTheme();
  const months = lastMonths(s.byMonth, today, 12);
  const best = bestMonthLine(bestMonth(s.byMonth), today);
  return (
    <Section title="Memorias por mes">
      {s.total === 0 ? (
        <Empty>
          Todavía no guardan ninguna memoria. La primera siempre sale chueca, y está bien.
        </Empty>
      ) : (
        <>
          <Card>
            <BarChart
              bars={months.map((m) => ({ label: m.label, value: m.count }))}
              accessibilityLabel={`Memorias de los últimos 12 meses: ${months
                .filter((m) => m.count > 0)
                .map((m) => `${m.label} ${m.count}`)
                .join(', ')}`}
            />
          </Card>
          <Pair>
            <StatTile value={formatNumber(s.total)} label="memorias" icon="memories" />
            <StatTile value={formatNumber(s.photos)} label="fotos" icon="photo" />
          </Pair>
          {best ? (
            <View style={{ gap: spacing.xs }}>
              <Text variant="note" tone="muted">
                {best}.
              </Text>
            </View>
          ) : null}
        </>
      )}
    </Section>
  );
}

function VisitsSection() {
  const router = useRouter();
  const { spacing, colors } = useTheme();
  const stats = useVisitStats();
  const open = () => router.push('/visits');
  const since = sinceLastVisitLine(stats.daysSinceLast);
  return (
    <Section title="Visitas">
      {stats.count === 0 ? (
        <>
          <Empty>Todavía no apuntan ninguna visita en persona.</Empty>
          <View style={{ alignItems: 'flex-start' }}>
            <Button title="Ver calendario" variant="ghost" onPress={open} />
          </View>
        </>
      ) : (
        <>
          {since ? <Text variant="ui">{since}</Text> : null}
          <Pair>
            <StatTile value={formatNumber(stats.count)} label="visitas" icon="suitcase" />
            <StatTile
              value={formatNumber(stats.daysTogether)}
              label="días juntos en persona"
              icon="couple"
            />
          </Pair>
          <Pair>
            <StatTile
              value={formatNumber(stats.daysApart)}
              label="días separados"
              icon="distance"
            />
            {stats.longestVisit !== null ? (
              <StatTile
                value={formatNumber(stats.longestVisit)}
                label="días, su visita más larga"
              />
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </Pair>
          {stats.pctTogether !== null ? (
            <View style={{ gap: spacing.xs }}>
              <MeterBar
                label="Del tiempo juntos en persona"
                value={stats.pctTogether}
                max={100}
                color={colors.ink}
                trailing={`${stats.pctTogether} %`}
                accessibilityLabel={`${stats.pctTogether} % del tiempo juntos en persona`}
              />
            </View>
          ) : null}
          <View style={{ alignItems: 'flex-start' }}>
            <Button title="Ver calendario" variant="ghost" onPress={open} />
          </View>
        </>
      )}
    </Section>
  );
}

function LoveLanguagesSection() {
  const router = useRouter();
  const { partnerName } = useNames();
  const { overview, isLoading, isError } = useLoveLanguages();
  if (isLoading || isError || !overview) return null;
  const { mine, partner, partnerDone } = overview;
  const open = () => router.push('/love-languages');
  const label = (scores: NonNullable<typeof mine>['scores']) =>
    primaryLabel(primaryLanguages(scores), LOVE_QUIZ.languages);

  return (
    <Section title="Lenguajes del amor">
      {mine && partner ? (
        <Text variant="body">
          Tú: {label(mine.scores)} · {partnerName}: {label(partner.scores)}
        </Text>
      ) : mine ? (
        <Text variant="body" tone="muted">
          Tú: {label(mine.scores)}. Cuando {partnerName} haga el test, aquí aparece el suyo.
        </Text>
      ) : (
        <Text variant="body" tone="muted">
          {partnerDone
            ? `${partnerName} ya lo hizo. Haz el tuyo para ver sus resultados.`
            : 'Todavía no hacen el test de los lenguajes del amor.'}
        </Text>
      )}
      <View style={{ alignItems: 'flex-start' }}>
        <Button title={mine ? 'Ver resultados' : 'Hacer el test'} variant="ghost" onPress={open} />
      </View>
    </Section>
  );
}

function useGoBack() {
  const router = useRouter();
  return () => ((router.canGoBack?.() ?? true) ? router.back() : router.replace('/more'));
}

/** Pantalla `/stats`: la relación en números grandes y gráficas simples. */
export function StatsScreen() {
  const { spacing } = useTheme();
  const goBack = useGoBack();
  const { couple } = useCouple();
  const { stats, isLoading, isError, refetch, isRefetching } = useRelationshipStats();
  const visits = useVisits();
  const languages = useLoveLanguages();

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader back onBack={goBack} title="Estadísticas" />
        <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
          <LoadingSymbol accessibilityLabel="Cargando las estadísticas" />
        </View>
      </Screen>
    );
  }
  if (isError || !stats) {
    return (
      <Screen>
        <ScreenHeader back onBack={goBack} title="Estadísticas" />
        <View style={{ marginTop: spacing.xl }}>
          <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
            No pudimos abrir las estadísticas. Revisa tu señal e intenta otra vez.
          </Notice>
        </View>
      </Screen>
    );
  }

  const today = stats.today ?? new Date().toISOString().slice(0, 10);
  const shared = sharedLine(stats.stories, stats.moods);
  const refresh = () => {
    void refetch();
    void visits.refetch();
    void languages.refetch();
  };

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={refresh}>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          back
          onBack={goBack}
          label={sinceStamp(stats.since ?? couple?.anniversary_date ?? null)}
          title="Estadísticas"
        />
        <QuestionsSection s={stats.questions} />
        <StreakSection s={stats.streak} />
        <GamesSection s={stats.games} drawings={stats.drawings} />
        <MemoriesSection s={stats.memories} today={today} />
        <VisitsSection />
        <LoveLanguagesSection />
        <Text variant="ui" tone="muted">
          {shared ?? 'Todavía no comparten stories ni moods.'}
        </Text>
      </View>
    </Screen>
  );
}

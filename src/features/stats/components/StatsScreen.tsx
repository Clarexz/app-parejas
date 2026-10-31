import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import {
  Button,
  CloudOff,
  Divider,
  Doodle,
  EmptyState,
  GridColumns,
  GridScore,
  Icon,
  IconButton,
  LoadingLines,
  PageHeader,
  Screen,
  Text,
} from '@/components';
import { useCouple } from '@/features/couple';
import { useNames } from '@/features/games/components/useNames';
import { useLoveLanguages } from '@/features/love-languages';
import { LOVE_QUIZ } from '@/features/love-languages/quiz';
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

/** Renglón de la hoja: concepto a la izquierda, cifra a la derecha (Figtree, cifras alineadas). */
function Row({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.md }}
    >
      <Text variant="body" style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Empty({ children }: { children: string }) {
  return (
    <Text variant="body" muted>
      {children}
    </Text>
  );
}

function QuestionsSection({ s }: { s: RelationshipStats['questions'] }) {
  const { spacing } = useTheme();
  const { partnerName } = useNames();
  const none = s.answeredMe + s.answeredPartner === 0;
  return (
    <Section title="Preguntas">
      {none ? (
        <Empty>Todavía no contestan ninguna pregunta. La de hoy es buen momento.</Empty>
      ) : (
        <>
          <View
            accessible
            accessibilityLabel={`${plural(s.dailyComplete, 'día', 'días')} que contestaron los dos`}
            style={{ alignSelf: 'flex-start', gap: spacing.xs }}
          >
            <View style={{ alignSelf: 'flex-start' }}>
              <Text variant="hero" style={{ fontVariant: ['tabular-nums'] }}>
                {formatNumber(s.dailyComplete)}
              </Text>
              <Doodle kind="underline" width={96} style={{ marginTop: -spacing.xs }} />
            </View>
            <Text variant="hand">
              {s.dailyComplete === 1 ? 'día contestaron los dos' : 'días contestaron los dos'}
            </Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            <Row label="Contestadas por ti" value={formatNumber(s.answeredMe)} />
            <Row label={`Contestadas por ${partnerName}`} value={formatNumber(s.answeredPartner)} />
            <Row label="Comentarios" value={formatNumber(s.comments)} />
          </View>
        </>
      )}
    </Section>
  );
}

function StreakSection({ s }: { s: RelationshipStats['streak'] }) {
  const { colors, spacing } = useTheme();
  return (
    <Section title="Racha">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {s.current > 0 ? <Icon name="flame" size={28} color={colors.cempasuchil} draw /> : null}
        <Text variant="hand" style={{ flex: 1 }}>
          {streakSentence(s.current)}
        </Text>
      </View>
      <Text variant="body" muted>
        {bestStreakSentence(s.best)}
      </Text>
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
  const line = matchLine(s.avgPct);
  return (
    <Section title="Juegos">
      {s.rounds === 0 ? (
        <Empty>Todavía no juegan ninguna ronda.</Empty>
      ) : (
        <>
          {line ? <Text variant="hand">{line}</Text> : null}
          <View style={{ gap: spacing.sm }}>
            <Row label="Rondas terminadas" value={formatNumber(s.rounds)} />
            {s.avgPct !== null ? (
              <Row label="Coincidencia promedio" value={`${s.avgPct} %`} />
            ) : null}
            {s.bestPct !== null ? <Row label="Su mejor ronda" value={`${s.bestPct} %`} /> : null}
          </View>
          <View style={{ gap: spacing.md }}>
            {s.byGame.map((g) => (
              <View
                key={g.game}
                style={{ gap: spacing.xs }}
                accessible
                accessibilityLabel={`${GAMES[g.game].name}: ${plural(g.rounds, 'ronda', 'rondas')}${
                  g.avgPct !== null ? `, coinciden en ${g.avgPct} %` : ''
                }`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.md }}>
                  <Text variant="body" style={{ flex: 1 }}>
                    {GAMES[g.game].name}
                  </Text>
                  <Text variant="small" muted style={{ fontVariant: ['tabular-nums'] }}>
                    {plural(g.rounds, 'ronda', 'rondas')}
                    {g.avgPct !== null ? ` · ${g.avgPct} %` : ''}
                  </Text>
                </View>
                {g.avgPct !== null ? (
                  <GridScore value={Math.round(g.avgPct / 10)} total={10} tone="jamaica" />
                ) : null}
              </View>
            ))}
          </View>
        </>
      )}
      <Text variant="body" muted>
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
          Todavía no pegan ninguna memoria. La primera siempre sale chueca, y está bien.
        </Empty>
      ) : (
        <>
          <GridColumns
            columns={months.map((m) => ({ label: m.label, value: m.count }))}
            accessibilityLabel={`Memorias de los últimos 12 meses: ${months
              .filter((m) => m.count > 0)
              .map((m) => `${m.label} ${m.count}`)
              .join(', ')}`}
          />
          <View style={{ gap: spacing.xs }}>
            <Text variant="body">
              {plural(s.total, 'memoria', 'memorias')} y {plural(s.photos, 'foto', 'fotos')} en
              total.
            </Text>
            {best ? (
              <Text variant="body" muted>
                {best}.
              </Text>
            ) : null}
          </View>
        </>
      )}
    </Section>
  );
}

function VisitsSection() {
  const router = useRouter();
  const { spacing } = useTheme();
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
          {since ? <Text variant="hand">{since}</Text> : null}
          <View style={{ gap: spacing.sm }}>
            <Row label="Visitas" value={formatNumber(stats.count)} />
            <Row label="Días juntos en persona" value={formatNumber(stats.daysTogether)} />
            <Row label="Días separados" value={formatNumber(stats.daysApart)} />
            {stats.longestVisit !== null ? (
              <Row label="Su visita más larga" value={plural(stats.longestVisit, 'día', 'días')} />
            ) : null}
          </View>
          {stats.pctTogether !== null ? (
            <View style={{ gap: spacing.xs }}>
              <GridScore
                value={Math.round(stats.pctTogether / 5)}
                total={20}
                tone="jamaica"
                accessibilityLabel={`${stats.pctTogether} % del tiempo juntos en persona`}
              />
              <Text variant="caption" muted>
                {stats.pctTogether} % del tiempo juntos en persona
              </Text>
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
        <Text variant="body" muted>
          Tú: {label(mine.scores)}. Cuando {partnerName} haga el test, aquí aparece el suyo.
        </Text>
      ) : (
        <Text variant="body" muted>
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

function BackBar() {
  const router = useRouter();
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
      <IconButton
        name="back"
        accessibilityLabel="Volver"
        onPress={() => ((router.canGoBack?.() ?? true) ? router.back() : router.replace('/more'))}
      />
    </View>
  );
}

/** Pantalla `/stats`: la relación contada como páginas de diario, sin tableros (DISENO §1). */
export function StatsScreen() {
  const { spacing } = useTheme();
  const { couple } = useCouple();
  const { stats, isLoading, isError, refetch, isRefetching } = useRelationshipStats();
  const visits = useVisits();
  const languages = useLoveLanguages();

  if (isLoading) {
    return (
      <Screen>
        <BackBar />
        <LoadingLines count={6} accessibilityLabel="Cargando las estadísticas" />
      </Screen>
    );
  }
  if (isError || !stats) {
    return (
      <Screen>
        <BackBar />
        <EmptyState
          illustration={<CloudOff />}
          title="No pudimos abrir las estadísticas"
          body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
          actionLabel="Reintentar"
          onAction={() => void refetch()}
        />
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
        <BackBar />
        <PageHeader
          stamp={sinceStamp(stats.since ?? couple?.anniversary_date ?? null)}
          title="Estadísticas"
        />
        <QuestionsSection s={stats.questions} />
        <Divider />
        <StreakSection s={stats.streak} />
        <Divider />
        <GamesSection s={stats.games} drawings={stats.drawings} />
        <Divider />
        <MemoriesSection s={stats.memories} today={today} />
        <Divider />
        <VisitsSection />
        <Divider />
        <LoveLanguagesSection />
        <Divider />
        <Text variant="hand">{shared ?? 'Todavía no comparten stories ni moods.'}</Text>
      </View>
    </Screen>
  );
}

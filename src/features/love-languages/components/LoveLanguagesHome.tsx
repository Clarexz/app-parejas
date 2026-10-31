import { useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  Button,
  Card,
  CloudOff,
  Divider,
  EmptyState,
  LoadingLines,
  Note,
  PageHeader,
  Screen,
  Text,
} from '@/components';
import { useNames } from '@/features/games/components/useNames';
import { comparisonHeadline, primaryLanguages } from '@/lib/loveLanguages';
import { useTheme } from '@/theme';

import { useLoveLanguages } from '../hooks';
import { LOVE_QUIZ, languageInfo } from '../quiz';
import { LanguageResult } from './LanguageResult';
import { BackBar } from './ui';

function Intro() {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="body">
        Todos damos y recibimos cariño de formas distintas. Son cinco “idiomas” y el test, de 30
        preguntas cortas, les dice cuál habla cada quien:
      </Text>
      <View style={{ gap: spacing.xs }}>
        {LOVE_QUIZ.languages.map((l) => (
          <Text key={l.key} variant="body">
            <Text variant="bodyStrong">{l.name}</Text>
            <Text variant="body" muted>
              {' '}
              · {l.short}
            </Text>
          </Text>
        ))}
      </View>
    </View>
  );
}

/** "Cómo querer a Ale en su idioma": descripción y consejos del lenguaje principal. */
function HowToLove({ keys, partnerName }: { keys: string[]; partnerName: string }) {
  const { spacing, colors } = useTheme();
  const info = languageInfo(keys[0] ?? '');
  if (!info) return null;
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="title" accessibilityRole="header">
        Cómo querer a {partnerName} en su idioma
      </Text>
      <Card>
        <View style={{ gap: spacing.sm }}>
          <Text variant="bodyStrong">{info.name}</Text>
          <Text variant="body" muted>
            {info.description}
          </Text>
          <Divider />
          {info.tips.map((tip) => (
            <Text key={tip} variant="body">
              • {tip}
            </Text>
          ))}
        </View>
      </Card>
      <Note id={`ll-distance-${info.key}`} tape={false}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="bodyStrong" style={{ color: colors.onPostit }}>
            Si están lejos
          </Text>
          {info.distanceTips.map((tip) => (
            <Text key={tip} variant="body" style={{ color: colors.onPostit }}>
              • {tip}
            </Text>
          ))}
        </View>
      </Note>
    </View>
  );
}

/** Pantalla `/love-languages`: invitación al test o resultados de los dos. */
export function LoveLanguagesHome() {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const { partnerName } = useNames();
  const { overview, isLoading, isError, refetch, isRefetching } = useLoveLanguages();

  if (isLoading) {
    return (
      <Screen>
        <BackBar />
        <LoadingLines count={5} accessibilityLabel="Cargando los lenguajes del amor" />
      </Screen>
    );
  }
  if (isError || !overview) {
    return (
      <Screen>
        <BackBar />
        <EmptyState
          illustration={<CloudOff />}
          title="No pudimos abrir los lenguajes"
          body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
          actionLabel="Reintentar"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  const { mine, partner, partnerDone } = overview;
  const start = () => router.push('/love-languages/quiz');

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View style={{ gap: spacing.xl }}>
        <BackBar />
        <PageHeader stamp="TEST" title="Lenguajes del amor" />

        {!mine ? (
          <View style={{ gap: spacing.xl }}>
            <Intro />
            {partnerDone ? (
              <Note id="ll-partner-done" tilt={-1}>
                <Text variant="hand" style={{ color: colors.onPostit }}>
                  {partnerName} ya lo hizo. Haz el tuyo para ver sus resultados.
                </Text>
              </Note>
            ) : null}
            <View style={{ alignItems: 'flex-start' }}>
              <Button title="Hacer el test" onPress={start} />
            </View>
          </View>
        ) : (
          <View style={{ gap: spacing.xl }}>
            {partner ? (
              <Text variant="title" accessibilityRole="header">
                {comparisonHeadline(mine.scores, partner.scores, LOVE_QUIZ.languages, partnerName)}
              </Text>
            ) : (
              <Note id="ll-waiting" tilt={-1}>
                <Text variant="hand" style={{ color: colors.onPostit }}>
                  Le avisamos a {partnerName}. Cuando haga el test, aquí aparecen sus resultados.
                </Text>
              </Note>
            )}

            <LanguageResult heading="Tus resultados" scores={mine.scores} tone="jamaica" />
            {partner ? (
              <LanguageResult
                heading={`Resultados de ${partnerName}`}
                scores={partner.scores}
                tone="nopal"
              />
            ) : null}

            {partner && primaryLanguages(partner.scores).length > 0 ? (
              <HowToLove keys={primaryLanguages(partner.scores)} partnerName={partnerName} />
            ) : null}

            <View style={{ alignItems: 'flex-start' }}>
              <Button title="Volver a hacer el test" variant="secondary" onPress={start} />
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

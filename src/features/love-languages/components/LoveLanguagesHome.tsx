import { useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  Button,
  Card,
  Divider,
  LoadingSymbol,
  Notice,
  Screen,
  ScreenHeader,
  Text,
} from '@/components';
import { useFruits } from '@/features/couple';
import { useNames } from '@/features/games/components/useNames';
import { comparisonHeadline, primaryLanguages } from '@/lib/loveLanguages';
import { useTheme } from '@/theme';

import { useLoveLanguages } from '../hooks';
import { LOVE_QUIZ, languageInfo } from '../quiz';
import { LanguageResult } from './LanguageResult';
import { useGoBack } from './ui';

function Intro() {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.lg }}>
      <Text variant="body">
        Todos damos y recibimos cariño de formas distintas. Son cinco lenguajes y el test, de 30
        preguntas cortas, les dice cuál habla cada quien.
      </Text>
      <Card>
        {LOVE_QUIZ.languages.map((l, i) => (
          <View key={l.key}>
            {i > 0 ? <Divider /> : null}
            <View style={{ paddingVertical: spacing.sm, gap: spacing.xxs }}>
              <Text variant="bodyStrong">{l.name}</Text>
              <Text variant="note" tone="muted">
                {l.short}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

/** "Cómo querer a Ale en su idioma": descripción y consejos del lenguaje principal. */
function HowToLove({ keys, partnerName }: { keys: string[]; partnerName: string }) {
  const { spacing } = useTheme();
  const info = languageInfo(keys[0] ?? '');
  if (!info) return null;
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="h3" accessibilityRole="header">
        Cómo querer a {partnerName} en su idioma
      </Text>
      <Card>
        <Text variant="bodyStrong">{info.name}</Text>
        <Text variant="body" tone="muted">
          {info.description}
        </Text>
        <Divider />
        {info.tips.map((tip) => (
          <Text key={tip} variant="body">
            • {tip}
          </Text>
        ))}
      </Card>
      <Card>
        <Text variant="bodyStrong">Si están lejos</Text>
        {info.distanceTips.map((tip) => (
          <Text key={tip} variant="body">
            • {tip}
          </Text>
        ))}
      </Card>
    </View>
  );
}

/** Pantalla `/love-languages`: invitación al test o resultados de los dos. */
export function LoveLanguagesHome() {
  const { spacing } = useTheme();
  const router = useRouter();
  const goBack = useGoBack();
  const fruits = useFruits();
  const { partnerName } = useNames();
  const { overview, isLoading, isError, refetch, isRefetching } = useLoveLanguages();

  const header = <ScreenHeader back onBack={goBack} title="Lenguajes del amor" />;

  if (isLoading) {
    return (
      <Screen>
        {header}
        <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
          <LoadingSymbol accessibilityLabel="Cargando los lenguajes del amor" />
        </View>
      </Screen>
    );
  }
  if (isError || !overview) {
    return (
      <Screen>
        {header}
        <View style={{ marginTop: spacing.xl }}>
          <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
            No pudimos abrir los lenguajes. Revisa tu señal e intenta otra vez.
          </Notice>
        </View>
      </Screen>
    );
  }

  const { mine, partner, partnerDone } = overview;
  const start = () => router.push('/love-languages/quiz');
  const partnerFruit = fruits.partner ?? fruits.me;

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View style={{ gap: spacing.xl }}>
        {header}

        {!mine ? (
          <View style={{ gap: spacing.xl }}>
            <Intro />
            {partnerDone ? (
              <Notice>{`${partnerName} ya lo hizo. Haz el tuyo para ver sus resultados.`}</Notice>
            ) : null}
            <Button title="Hacer el test" onPress={start} fullWidth />
          </View>
        ) : (
          <View style={{ gap: spacing.xl }}>
            {partner ? (
              <Text variant="h2" accessibilityRole="header">
                {comparisonHeadline(mine.scores, partner.scores, LOVE_QUIZ.languages, partnerName)}
              </Text>
            ) : (
              <Notice>
                {`Le avisamos a ${partnerName}. Cuando haga el test, aquí aparecen sus resultados.`}
              </Notice>
            )}

            <LanguageResult heading="Tus resultados" scores={mine.scores} fruit={fruits.me} />
            {partner ? (
              <LanguageResult
                heading={`Resultados de ${partnerName}`}
                scores={partner.scores}
                fruit={partnerFruit}
              />
            ) : null}

            {partner && primaryLanguages(partner.scores).length > 0 ? (
              <HowToLove keys={primaryLanguages(partner.scores)} partnerName={partnerName} />
            ) : null}

            <Button title="Volver a hacer el test" variant="secondary" onPress={start} fullWidth />
          </View>
        )}
      </View>
    </Screen>
  );
}

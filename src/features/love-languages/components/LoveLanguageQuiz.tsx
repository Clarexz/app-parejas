import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  ArrivalOverlay,
  Button,
  Screen,
  ScreenHeader,
  Sheet,
  Text,
  useTapScale,
  useToast,
} from '@/components';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import type { LoveLanguageOption } from '@/lib/loveLanguages';
import { useTheme } from '@/theme';

import { useSubmitLoveLanguageTest } from '../hooks';
import { LOVE_QUIZ } from '../quiz';

/** Una de las dos opciones: tarjeta grande en `surface` que se achica al presionar. */
function ChoiceCard({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  const tap = useTapScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      onPressIn={tap.onPressIn}
      onPressOut={tap.onPressOut}
    >
      <Animated.View
        style={[
          {
            minHeight: 96,
            justifyContent: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            padding: spacing.xl,
            opacity: disabled ? 0.6 : 1,
          },
          tap.style,
        ]}
      >
        <Text variant="bodyStrong">{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Progreso del test: barra en tu fruta. */
function Progress({ count, total }: { count: number; total: number }) {
  const { colors, fruit } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${count} de ${total} contestadas`}
      style={{ height: 8, borderRadius: 4, backgroundColor: colors.surface2, overflow: 'hidden' }}
    >
      <View
        style={{
          height: 8,
          borderRadius: 4,
          width: `${Math.round((count / total) * 100)}%`,
          backgroundColor: fruit.me.hex,
        }}
      />
    </View>
  );
}

/** Pantalla `/love-languages/quiz`: una pregunta por pantalla, dos opciones grandes. */
export function LoveLanguageQuiz() {
  const { spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const submit = useSubmitLoveLanguageTest();
  const items = LOVE_QUIZ.items;

  // `answers[i]` = lenguaje elegido en la pregunta i.
  const [answers, setAnswers] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [done, setDone] = useState(false);

  const item = items[Math.min(index, items.length - 1)]!;
  const hasProgress = answers.length > 0 && !done;

  const leave = () => {
    if (router.canGoBack?.() ?? true) router.back();
    else router.replace('/love-languages');
  };
  const requestExit = () => (hasProgress ? setConfirmExit(true) : leave());

  // El botón de atrás de Android también pide confirmación si ya contestaste algo.
  useEffect(() => {
    if (!hasProgress) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setConfirmExit(true);
      return true;
    });
    return () => sub.remove();
  }, [hasProgress]);

  const finish = (all: string[]) => {
    submit.mutate(
      { answers: all, quizVersion: LOVE_QUIZ.version },
      {
        onSuccess: () => setDone(true),
        onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
      },
    );
  };

  const choose = (option: LoveLanguageOption) => {
    if (submit.isPending || done) return;
    haptic.light();
    const next = [...answers.slice(0, index), option.language];
    setAnswers(next);
    if (index + 1 >= items.length) finish(next);
    else setIndex(index + 1);
  };

  const options: [LoveLanguageOption, LoveLanguageOption] = [item.a, item.b];
  const busy = submit.isPending || done;

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <View style={{ gap: spacing.xl }}>
          <ScreenHeader
            back="Salir"
            onBack={requestExit}
            label={`${index + 1} de ${items.length}`}
            title="Lenguajes del amor"
          />
          <Progress count={index} total={items.length} />
          <Text key={item.id} variant="h2" accessibilityRole="header">
            ¿Qué te llega más?
          </Text>
          <View style={{ gap: spacing.md }}>
            <ChoiceCard
              label={options[0].text}
              disabled={busy}
              onPress={() => choose(options[0])}
            />
            <ChoiceCard
              label={options[1].text}
              disabled={busy}
              onPress={() => choose(options[1])}
            />
          </View>
          <View style={{ alignItems: 'flex-start' }}>
            <Button
              title="Pregunta anterior"
              variant="ghost"
              disabled={index === 0 || busy}
              onPress={() => setIndex(index - 1)}
            />
          </View>
        </View>

        <Sheet visible={confirmExit} onClose={() => setConfirmExit(false)} title="¿Salir del test?">
          <View style={{ gap: spacing.lg }}>
            <Text variant="body" tone="muted">
              Si sales, se pierden las respuestas que llevas y empiezas de cero la próxima vez.
            </Text>
            <View style={{ gap: spacing.sm }}>
              <Button title="Seguir con el test" onPress={() => setConfirmExit(false)} fullWidth />
              <Button
                title="Salir"
                variant="ghost"
                onPress={() => {
                  setConfirmExit(false);
                  leave();
                }}
                fullWidth
              />
            </View>
          </View>
        </Sheet>
      </Screen>
      {done ? (
        <ArrivalOverlay text="Listo." onDone={() => router.replace('/love-languages')} />
      ) : null}
    </View>
  );
}

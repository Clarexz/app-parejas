import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  Button,
  Card,
  PageHeader,
  Screen,
  SealOverlay,
  Sheet,
  Tally,
  Text,
  useStickIn,
  useToast,
} from '@/components';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import type { LoveLanguageOption } from '@/lib/loveLanguages';
import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

import { useSubmitLoveLanguageTest } from '../hooks';
import { LOVE_QUIZ } from '../quiz';
import { BackBar } from './ui';

/** Respuesta como papelito (mismo estilo que las rondas de juegos). */
function Papelito({
  label,
  tilt,
  tone,
  disabled,
  onPress,
}: {
  label: string;
  tilt: number;
  tone: 'postit' | 'mint';
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radius, shadows } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{ transform: [{ rotate: `${tilt}deg` }] }}
    >
      {({ pressed }) => (
        <View
          style={{
            minHeight: 72,
            justifyContent: 'center',
            backgroundColor: tone === 'postit' ? colors.postit : colors.tapeMint,
            borderRadius: radius.none,
            padding: spacing.lg,
            boxShadow: pressed ? shadows.lifted : shadows.object,
            opacity: disabled ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          }}
        >
          <Text variant="hand" style={{ color: tone === 'postit' ? colors.onPostit : colors.ink }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** La pregunta fija en una ficha que se "pega" al llegar. */
function PromptCard({ id }: { id: string }) {
  const { spacing } = useTheme();
  const stick = useStickIn(tiltFor(id, 1));
  return (
    <Animated.View style={stick}>
      <Card>
        <View style={{ minHeight: spacing.xxxl * 1.5, justifyContent: 'center' }}>
          <Text variant="title">¿Qué te llega más?</Text>
        </View>
      </Card>
    </Animated.View>
  );
}

const SEAL_MS = 1100;

/** Pantalla `/love-languages/quiz`: una pregunta por pantalla, dos papelitos. */
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
  const [sealed, setSealed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const item = items[Math.min(index, items.length - 1)]!;
  const hasProgress = answers.length > 0 && !sealed;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

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
        onSuccess: () => {
          haptic.stamp();
          setSealed(true);
          timer.current = setTimeout(() => router.replace('/love-languages'), SEAL_MS);
        },
        onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
      },
    );
  };

  const choose = (option: LoveLanguageOption) => {
    if (submit.isPending || sealed) return;
    haptic.stick();
    const next = [...answers.slice(0, index), option.language];
    setAnswers(next);
    if (index + 1 >= items.length) finish(next);
    else setIndex(index + 1);
  };

  const options: [LoveLanguageOption, LoveLanguageOption] = [item.a, item.b];
  const busy = submit.isPending || sealed;

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <View style={{ gap: spacing.xl }}>
          <BackBar onPress={requestExit} />
          <PageHeader stamp="TEST" title="Lenguajes del amor" />
          <View style={{ gap: spacing.sm }}>
            <Text variant="small" muted>
              {index + 1} de {items.length}
            </Text>
            <Tally
              total={items.length}
              count={index}
              accessibilityLabel={`${index} de ${items.length} contestadas`}
            />
          </View>
          <PromptCard key={item.id} id={item.id} />
          <View style={{ gap: spacing.lg }}>
            <Papelito
              label={options[0].text}
              tone="postit"
              tilt={-1.5}
              disabled={busy}
              onPress={() => choose(options[0])}
            />
            <Papelito
              label={options[1].text}
              tone="mint"
              tilt={1.5}
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
            <Text variant="body" muted>
              Si sales, se pierden las respuestas que llevas y empiezas de cero la próxima vez.
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <Button
                title="Salir"
                onPress={() => {
                  setConfirmExit(false);
                  leave();
                }}
              />
              <Button
                title="Seguir con el test"
                variant="ghost"
                onPress={() => setConfirmExit(false)}
              />
            </View>
          </View>
        </Sheet>
      </Screen>
      {sealed ? <SealOverlay label="LISTO" /> : null}
    </View>
  );
}

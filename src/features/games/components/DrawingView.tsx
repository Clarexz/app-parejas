import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, View, useWindowDimensions } from 'react-native';

import {
  ArrivalOverlay,
  Button,
  Card,
  Divider,
  EmptyState,
  Input,
  Screen,
  Sheet,
  Text,
  useToast,
} from '@/components';
import { DrawingPad } from '@/features/stories/components/DrawingPad';
import { StrokesSvg } from '@/features/stories/components/StoryFrame';
import { CANVAS_H, CANVAS_W, type Stroke } from '@/lib/drawing';
import { errorMessage } from '@/lib/errors';
import {
  MAX_DRAWING_GUESSES,
  MAX_GUESS_LENGTH,
  drawingShareText,
  drawingTurn,
  guessesLeft,
  type Drawing,
} from '@/lib/games';
import { haptic } from '@/lib/haptics';
import { lightColors, useTheme } from '@/theme';

import {
  useDeleteDrawing,
  useDrawing,
  useGiveUpDrawing,
  useGuessDrawing,
  useRerollDrawingWord,
  useStartDrawing,
  useSubmitDrawing,
} from '../hooks';
import { ProgressRow } from './RoundProgress';
import { useNames } from './useNames';
import { BackBar, ErrorPage, LoadingPage, isGone, useGoBack } from './ui';

/** Lienzo con el dibujo ya enviado (siempre claro, como cuando se dibujó). */
function DrawingSheet({ strokes, width }: { strokes: Stroke[]; width: number }) {
  const { radius } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel="El dibujo del reto"
      style={{
        width,
        height: (width * CANVAS_H) / CANVAS_W,
        backgroundColor: lightColors.bg,
        borderRadius: radius.card,
        overflow: 'hidden',
      }}
    >
      <StrokesSvg strokes={strokes} colors={lightColors} width={width} />
    </View>
  );
}

/** Intentos hechos, tachados. */
function GuessList({ drawing }: { drawing: Drawing }) {
  const { spacing } = useTheme();
  if (drawing.guesses.length === 0) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      {drawing.guesses.map((g, i) => (
        <Text
          key={`${i}-${g.at}`}
          variant="body"
          tone="muted"
          style={{ textDecorationLine: 'line-through' }}
        >
          {g.text}
        </Text>
      ))}
    </View>
  );
}

function titleFor(turn: ReturnType<typeof drawingTurn>, d: Drawing): string {
  switch (turn) {
    case 'drawing':
      return 'A dibujar';
    case 'waiting_guess':
      return 'Ya lo mandaste';
    case 'my_guess':
      return 'A adivinar';
    case 'waiting_drawing':
      return 'Esperando el dibujo';
    case 'finished':
      return d.status === 'solved' ? 'Adivinado' : 'Se quedó sin adivinar';
  }
}

/** Pantalla `/drawing/<id>`: dibujar, adivinar y ver el resultado de un reto de dibujo. */
export function DrawingView({ id }: { id: string }) {
  const { spacing, page } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const goBack = useGoBack();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { meId, meName, partnerName, meFruit, partnerFruit } = useNames();
  const { drawing, isLoading, isError, error, refetch, isRefetching } = useDrawing(id);
  const reroll = useRerollDrawingWord(id);
  const submit = useSubmitDrawing(id);
  const guessMutation = useGuessDrawing(id);
  const giveUp = useGiveUpDrawing(id);
  const remove = useDeleteDrawing();
  const again = useStartDrawing();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [guess, setGuess] = useState('');
  const [confirm, setConfirm] = useState<'giveup' | 'delete' | null>(null);
  const [arrived, setArrived] = useState(false);

  if (isLoading) return <LoadingPage label="Cargando el reto" />;
  if (isError || !drawing) {
    return (
      <ErrorPage
        error={error}
        gone={!isError || isGone(error, 'drawing_not_found')}
        goneTitle="Ese dibujo ya no está"
        loadTitle="No pudimos abrir el reto"
        onRetry={() => void refetch()}
      />
    );
  }

  const turn = drawingTurn(drawing, meId);
  const iDrew = drawing.drawer_id === meId;
  const names = {
    drawer: iDrew ? meName : partnerName,
    guesser: iDrew ? partnerName : meName,
  };
  const width = windowWidth - page.gutter * 2;
  // El dibujo ocupa como mucho ~55 % del alto de la ventana (proporción 9:16, centrado).
  const viewWidth = Math.min(width, (windowHeight * 0.55 * CANVAS_W) / CANVAS_H);
  const finished = turn === 'finished';
  const canDelete = iDrew || finished;
  const onError = (e: unknown) => toast.show({ message: errorMessage(e), tone: 'danger' });
  const guesserFruit = iDrew ? partnerFruit : meFruit;

  const sendDrawing = () =>
    submit.mutate(
      { strokes },
      {
        onSuccess: () => {
          haptic.light();
          toast.show({ message: `Listo. ${partnerName} ya puede adivinar.`, tone: 'success' });
        },
        onError,
      },
    );
  const sendGuess = () => {
    const text = guess.trim();
    if (!text || guessMutation.isPending) return;
    guessMutation.mutate(text, {
      onSuccess: ({ correct }) => {
        setGuess('');
        if (correct) setArrived(true);
      },
      onError,
    });
  };
  const share = async () => {
    try {
      await Share.share({ message: drawingShareText(drawing, names) });
    } catch {
      // Sin hoja de compartir (web) o cancelado.
    }
  };
  const drawAgain = () =>
    again.mutate(undefined, {
      onSuccess: (d) => {
        haptic.light();
        router.replace({ pathname: '/drawing/[id]', params: { id: d.id } });
      },
      onError,
    });
  const confirmed = () => {
    if (confirm === 'giveup') {
      giveUp.mutate(undefined, {
        onSuccess: () => setConfirm(null),
        onError,
      });
    } else {
      remove.mutate(drawing.id, {
        onSuccess: () => {
          setConfirm(null);
          goBack();
        },
        onError,
      });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
        <View style={{ gap: spacing.lg }}>
          <BackBar />
          <View style={{ gap: spacing.xs }}>
            <Text variant="label" tone="muted">
              {finished ? 'Resultado' : 'Reto de dibujo'}
            </Text>
            <Text variant="h1" accessibilityRole="header">
              {titleFor(turn, drawing)}
            </Text>
          </View>

          {turn === 'drawing' ? (
            <>
              <Card tone="me">
                <Text variant="label" tone="muted">
                  Dibuja
                </Text>
                <Text variant="h2" accessibilityLabel={`Dibuja: ${drawing.word}`}>
                  {drawing.word ?? '…'}
                </Text>
              </Card>
              {drawing.rerolls_left > 0 ? (
                <Button
                  title={`Otra palabra (quedan ${drawing.rerolls_left})`}
                  variant="secondary"
                  loading={reroll.isPending}
                  onPress={() => reroll.mutate(undefined, { onError })}
                />
              ) : (
                <Text variant="note" tone="muted">
                  Ya cambiaste la palabra las 3 veces. A dibujar esta.
                </Text>
              )}
              <DrawingPad
                strokes={strokes}
                onChange={setStrokes}
                bg="paper"
                width={width}
                onLimit={() =>
                  toast.show({ message: 'Ya no caben más trazos. Deshaz alguno para seguir.' })
                }
              />
              <Button
                title="Mandar dibujo"
                fullWidth
                onPress={sendDrawing}
                disabled={strokes.length === 0}
                loading={submit.isPending}
              />
            </>
          ) : null}

          {turn === 'waiting_drawing' ? (
            <EmptyState
              art="spark"
              title={`${partnerName} está pensando qué dibujar`}
              body="Cuando lo mande, aquí aparece para que adivines."
            />
          ) : null}

          {turn === 'waiting_guess' && drawing.strokes ? (
            <>
              <View style={{ alignItems: 'center' }}>
                <DrawingSheet strokes={drawing.strokes} width={viewWidth} />
              </View>
              <ProgressRow
                fruit={partnerFruit}
                name={`Intentos de ${partnerName}`}
                count={drawing.guesses.length}
                total={MAX_DRAWING_GUESSES}
              />
              <GuessList drawing={drawing} />
              <Text variant="note" tone="muted">
                La palabra es «{drawing.word}».
              </Text>
            </>
          ) : null}

          {turn === 'my_guess' && drawing.strokes ? (
            <>
              <View style={{ alignItems: 'center' }}>
                <DrawingSheet strokes={drawing.strokes} width={viewWidth} />
              </View>
              <View style={{ gap: spacing.xs }}>
                <Text variant="note" tone="muted">
                  {partnerName} dibujó algo. ¿Qué será? ({drawing.word_length} letras)
                </Text>
                <Text variant="num" accessibilityLabel={`Pista: ${drawing.word_length} letras`}>
                  {drawing.hint}
                </Text>
              </View>
              <View style={{ gap: spacing.md }}>
                <Input
                  label="Tu intento"
                  value={guess}
                  onChangeText={setGuess}
                  maxLength={MAX_GUESS_LENGTH}
                  placeholder="Escribe lo que crees que es"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={sendGuess}
                  accessibilityLabel="Tu intento"
                />
                <Button
                  title="Adivinar"
                  fullWidth
                  onPress={sendGuess}
                  disabled={guess.trim().length === 0}
                  loading={guessMutation.isPending}
                />
              </View>
              <GuessList drawing={drawing} />
              <ProgressRow
                fruit={guesserFruit}
                name="Intentos usados"
                count={MAX_DRAWING_GUESSES - guessesLeft(drawing)}
                total={MAX_DRAWING_GUESSES}
              />
              <Text variant="note" tone="muted">
                Te quedan {guessesLeft(drawing)}{' '}
                {guessesLeft(drawing) === 1 ? 'intento' : 'intentos'}
              </Text>
              <Button title="Me rindo" variant="ghost" onPress={() => setConfirm('giveup')} />
            </>
          ) : null}

          {finished ? (
            <>
              {drawing.strokes ? (
                <View style={{ alignItems: 'center' }}>
                  <DrawingSheet strokes={drawing.strokes} width={viewWidth} />
                </View>
              ) : null}
              <View style={{ gap: spacing.xs }}>
                <Text variant="note" tone="muted">
                  {drawing.status === 'solved'
                    ? `${names.guesser} lo adivinó en ${drawing.guesses.length} ${drawing.guesses.length === 1 ? 'intento' : 'intentos'}. Era:`
                    : 'La palabra era:'}
                </Text>
                <Text variant="display">{drawing.word}</Text>
              </View>
              <GuessList drawing={drawing} />
              <Divider />
              <View style={{ gap: spacing.md }}>
                <Button
                  title="Ahora dibujo yo"
                  fullWidth
                  onPress={drawAgain}
                  loading={again.isPending}
                />
                <Button
                  title="Compartir"
                  variant="secondary"
                  fullWidth
                  onPress={() => void share()}
                />
              </View>
            </>
          ) : null}

          {canDelete ? (
            <Button title="Tirar este reto" variant="ghost" onPress={() => setConfirm('delete')} />
          ) : null}
        </View>

        <Sheet
          visible={confirm !== null}
          onClose={() => setConfirm(null)}
          title={confirm === 'giveup' ? '¿Te rindes?' : '¿Tirar este reto?'}
        >
          <View style={{ gap: spacing.lg }}>
            <Text variant="body" tone="muted">
              {confirm === 'giveup'
                ? `Se revela la palabra y el reto se termina. ${partnerName} se va a enterar.`
                : 'El dibujo se borra para los dos y no se puede deshacer.'}
            </Text>
            <Button
              title={confirm === 'giveup' ? 'Me rindo' : 'Tirarlo'}
              variant="danger"
              onPress={confirmed}
              loading={giveUp.isPending || remove.isPending}
            />
            <Button title="Mejor no" variant="ghost" onPress={() => setConfirm(null)} />
          </View>
        </Sheet>
      </Screen>
      {arrived ? <ArrivalOverlay text="Adivinaste." onDone={() => setArrived(false)} /> : null}
    </View>
  );
}

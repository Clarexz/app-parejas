import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, View, useWindowDimensions } from 'react-native';

import {
  Button,
  Divider,
  Input,
  Note,
  SealOverlay,
  Screen,
  Sheet,
  Stamp,
  Tally,
  Text,
  WaitingIllustration,
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
import { useTheme } from '@/theme';

import {
  useDeleteDrawing,
  useDrawing,
  useGiveUpDrawing,
  useGuessDrawing,
  useRerollDrawingWord,
  useStartDrawing,
  useSubmitDrawing,
} from '../hooks';
import { useNames } from './useNames';
import { BackBar, ErrorPage, LoadingPage, isGone, useGoBack } from './ui';

/** Hoja con el dibujo ya enviado (siempre sobre el papel claro del tema). */
function DrawingSheet({ strokes, width }: { strokes: Stroke[]; width: number }) {
  const { colors, shadows } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel="El dibujo del reto"
      style={{
        width,
        height: (width * CANVAS_H) / CANVAS_W,
        backgroundColor: colors.paper,
        borderWidth: 1.5,
        borderColor: colors.ruled,
        boxShadow: shadows.object,
        overflow: 'hidden',
      }}
    >
      <StrokesSvg strokes={strokes} colors={colors} width={width - 3} />
    </View>
  );
}

/** Intentos hechos, tachados como en un cuaderno. */
function GuessList({ drawing }: { drawing: Drawing }) {
  const { spacing } = useTheme();
  if (drawing.guesses.length === 0) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      {drawing.guesses.map((g, i) => (
        <Text
          key={`${i}-${g.at}`}
          variant="body"
          muted
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
  const { spacing, page, colors, type } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const goBack = useGoBack();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { meId, meName, partnerName } = useNames();
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
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    if (!sealed) return;
    const t = setTimeout(() => setSealed(false), 1800);
    return () => clearTimeout(t);
  }, [sealed]);

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
  const width = windowWidth - page.contentLeft - page.contentRight;
  // El dibujo ocupa como mucho ~55 % del alto de la ventana (proporción 9:16, centrado).
  const viewWidth = Math.min(width, (windowHeight * 0.55 * CANVAS_W) / CANVAS_H);
  const finished = turn === 'finished';
  const canDelete = iDrew || finished;
  const onError = (e: unknown) => toast.show({ message: errorMessage(e), tone: 'error' });

  const sendDrawing = () =>
    submit.mutate(
      { strokes },
      {
        onSuccess: () => {
          haptic.stamp();
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
        if (correct) {
          haptic.success();
          setSealed(true);
        }
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
        haptic.stick();
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

  const stampLabel = finished ? 'RESULTADO' : 'RETO DE DIBUJO';

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
        <View style={{ gap: spacing.lg }}>
          <BackBar />
          <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
            <Stamp tone={drawing.status === 'solved' ? 'nopal' : 'jamaica'}>{stampLabel}</Stamp>
            <Text variant="display" accessibilityRole="header">
              {titleFor(turn, drawing)}
            </Text>
          </View>

          {turn === 'drawing' ? (
            <>
              <Note id={drawing.id}>
                <Text variant="small" style={{ color: colors.onPostit }}>
                  Dibuja:
                </Text>
                <Text
                  variant="title"
                  style={{ color: colors.onPostit }}
                  accessibilityLabel={`Dibuja: ${drawing.word}`}
                >
                  {drawing.word ?? '…'}
                </Text>
              </Note>
              {drawing.rerolls_left > 0 ? (
                <Button
                  title={`Otra palabra (quedan ${drawing.rerolls_left})`}
                  variant="secondary"
                  loading={reroll.isPending}
                  onPress={() => reroll.mutate(undefined, { onError })}
                />
              ) : (
                <Text variant="caption" muted>
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
                onPress={sendDrawing}
                disabled={strokes.length === 0}
                loading={submit.isPending}
              />
            </>
          ) : null}

          {turn === 'waiting_drawing' ? (
            <View style={{ gap: spacing.md, alignItems: 'flex-start' }}>
              <WaitingIllustration />
              <Text variant="body" muted>
                {partnerName} está pensando qué dibujar. Cuando lo mande, aquí aparece para que
                adivines.
              </Text>
            </View>
          ) : null}

          {turn === 'waiting_guess' && drawing.strokes ? (
            <>
              <View style={{ alignItems: 'center' }}>
                <DrawingSheet strokes={drawing.strokes} width={viewWidth} />
              </View>
              <View style={{ gap: spacing.sm }}>
                <Text variant="body">
                  {partnerName} está adivinando · intentos {drawing.guesses.length}/
                  {MAX_DRAWING_GUESSES}
                </Text>
                <Tally
                  total={MAX_DRAWING_GUESSES}
                  count={drawing.guesses.length}
                  tone="chile"
                  accessibilityLabel={`${drawing.guesses.length} intentos de ${MAX_DRAWING_GUESSES}`}
                />
              </View>
              <GuessList drawing={drawing} />
              <Text variant="small" muted>
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
                <Text variant="small" muted>
                  {partnerName} dibujó algo. ¿Qué será? ({drawing.word_length} letras)
                </Text>
                <Text
                  variant="stamp"
                  accessibilityLabel={`Pista: ${drawing.word_length} letras`}
                  style={{
                    fontSize: type.heading.fontSize,
                    lineHeight: type.heading.lineHeight,
                    letterSpacing: spacing.xs,
                  }}
                >
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
                  onPress={sendGuess}
                  disabled={guess.trim().length === 0}
                  loading={guessMutation.isPending}
                />
              </View>
              <GuessList drawing={drawing} />
              <View style={{ gap: spacing.xs }}>
                <Text variant="small" muted>
                  Te quedan {guessesLeft(drawing)}{' '}
                  {guessesLeft(drawing) === 1 ? 'intento' : 'intentos'}
                </Text>
                <Tally
                  total={MAX_DRAWING_GUESSES}
                  count={guessesLeft(drawing)}
                  accessibilityLabel={`Te quedan ${guessesLeft(drawing)} intentos`}
                />
              </View>
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
                <Text variant="small" muted>
                  {drawing.status === 'solved'
                    ? `${names.guesser} lo adivinó en ${drawing.guesses.length} ${drawing.guesses.length === 1 ? 'intento' : 'intentos'}. Era:`
                    : 'La palabra era:'}
                </Text>
                <Text variant="display">{drawing.word}</Text>
              </View>
              <GuessList drawing={drawing} />
              <Divider />
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                <Button title="Compartir" variant="secondary" onPress={() => void share()} />
                <Button title="Ahora dibujo yo" onPress={drawAgain} loading={again.isPending} />
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
            <Text variant="body" muted>
              {confirm === 'giveup'
                ? `Se revela la palabra y el reto se termina. ${partnerName} se va a enterar.`
                : 'El dibujo se borra para los dos y no se puede deshacer.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <Button
                title={confirm === 'giveup' ? 'Me rindo' : 'Tirarlo'}
                onPress={confirmed}
                loading={giveUp.isPending || remove.isPending}
              />
              <Button title="Mejor no" variant="ghost" onPress={() => setConfirm(null)} />
            </View>
          </View>
        </Sheet>
      </Screen>
      {sealed ? <SealOverlay label="¡ADIVINASTE!" /> : null}
    </View>
  );
}

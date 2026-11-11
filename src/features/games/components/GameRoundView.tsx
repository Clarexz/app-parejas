import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import {
  Button,
  Divider,
  FruitDot,
  Icon,
  LoadingSymbol,
  Screen,
  Sheet,
  Text,
  useArrive,
  useToast,
} from '@/components';
import Animated from 'react-native-reanimated';
import { errorMessage } from '@/lib/errors';
import {
  GAMES,
  answerLabels,
  itemMatches,
  matchHeadline,
  nextItem,
  pointedAt,
  roundShareText,
  roundTurn,
  type GameItem,
  type GameRound,
} from '@/lib/games';
import { haptic } from '@/lib/haptics';
import { useShareCard } from '@/features/share';
import { useTheme } from '@/theme';

import { useAnswerGameItem, useDeleteGameRound, useGameRound, useStartGameRound } from '../hooks';
import { RoundProgress } from './RoundProgress';
import { useNames } from './useNames';
import { BackBar, ErrorPage, LoadingPage, isGone, useGoBack } from './ui';

/** La frase del ítem: llega con un fundido corto (§5) y va directo sobre el fondo. */
function ItemText({ item }: { item: GameItem }) {
  const arrive = useArrive();
  return (
    <Animated.View style={arrive}>
      <View style={{ minHeight: 96, justifyContent: 'center' }}>
        <Text variant={item.text.length > 120 ? 'h3' : 'h2'} accessibilityRole="header">
          {item.text}
        </Text>
      </View>
    </Animated.View>
  );
}

/** Respuesta grande: botón `surface` de 72 dp. */
function OptionButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 72,
        justifyContent: 'center',
        backgroundColor: pressed ? colors.surface2 : colors.surface,
        borderRadius: radius.card,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl - 4,
        opacity: disabled ? 0.6 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Text variant="bodyStrong">{label}</Text>
    </Pressable>
  );
}

function useProgressProps(round: GameRound) {
  const { meName, partnerName, meFruit, partnerFruit } = useNames();
  return {
    total: round.total,
    me: { fruit: meFruit, name: meName, count: round.my_count },
    partner: { fruit: partnerFruit, name: partnerName, count: round.partner_count },
  };
}

function Playing({ round }: { round: GameRound }) {
  const { spacing } = useTheme();
  const toast = useToast();
  const { partnerName } = useNames();
  const progress = useProgressProps(round);
  const answer = useAnswerGameItem(round.id);
  const item = nextItem(round);
  if (!item) return null;
  const labels = answerLabels(round.game, item, partnerName);

  const choose = (choice: 0 | 1) => {
    haptic.light();
    answer.mutate(
      { questionId: item.id, choice },
      { onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }) },
    );
  };

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.md }}>
        <Text variant="label" tone="muted">
          {Math.min(round.my_count + 1, round.total)} de {round.total}
        </Text>
        <RoundProgress {...progress} />
      </View>
      <ItemText key={item.id} item={item} />
      <View style={{ gap: spacing.md }}>
        <OptionButton label={labels[0]} disabled={answer.isPending} onPress={() => choose(0)} />
        <OptionButton label={labels[1]} disabled={answer.isPending} onPress={() => choose(1)} />
      </View>
    </View>
  );
}

function Waiting({ round }: { round: GameRound }) {
  const { spacing } = useTheme();
  const { partnerName } = useNames();
  const progress = useProgressProps(round);
  return (
    <View style={{ gap: spacing.lg, alignItems: 'flex-start' }}>
      <LoadingSymbol size={64} accessibilityLabel={`Esperando a ${partnerName}`} />
      <Text variant="h3" accessibilityRole="header">
        Ya quedó tu parte
      </Text>
      <Text variant="body" tone="muted">
        Falta {partnerName}. Cuando termine, aquí aparece cuánto coincidieron.
      </Text>
      <View style={{ alignSelf: 'stretch' }}>
        <RoundProgress {...progress} />
      </View>
    </View>
  );
}

function ResultRow({ round, item }: { round: GameRound; item: GameItem }) {
  const { spacing, colors } = useTheme();
  const { meName, partnerName, meFruit, partnerFruit } = useNames();
  const m = round.mine[item.id];
  const p = round.partner?.[item.id];
  if (m === undefined || p === undefined) return null;
  const hit = itemMatches(round.game, m, p);
  const who = (side: 'me' | 'partner') => (side === 'me' ? meName : partnerName);
  const mineText =
    round.game === 'most_likely'
      ? `señalaste a ${who(pointedAt(round.game, m, true))}`
      : answerLabels(round.game, item, partnerName)[m];
  const partnerText =
    round.game === 'most_likely'
      ? `señaló a ${who(pointedAt(round.game, p, false))}`
      : answerLabels(round.game, item, partnerName)[p];
  return (
    <View
      accessible
      accessibilityLabel={`${item.text}. ${hit ? 'Coincidieron.' : 'No coincidieron.'} Tú: ${mineText}. ${partnerName}: ${partnerText}.`}
      style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md }}
    >
      <View style={{ flex: 1, gap: spacing.sm }}>
        <Text variant="bodyStrong">{item.text}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <FruitDot fruit={meFruit} />
          <Text variant="body" style={{ flex: 1 }}>
            {mineText}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <FruitDot fruit={partnerFruit} />
          <Text variant="body" style={{ flex: 1 }}>
            {partnerText}
          </Text>
        </View>
      </View>
      <View style={{ width: 28, alignItems: 'center', paddingTop: spacing.xs }}>
        {hit ? <Icon name="check" size={24} color={colors.success} /> : null}
      </View>
    </View>
  );
}

function Finished({ round }: { round: GameRound }) {
  const { spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { meName, partnerName } = useNames();
  const again = useStartGameRound();
  const match = round.match;

  const cardShare = useShareCard();

  // Con resultado se manda la tarjeta-imagen; sin ella (o sin hoja de archivos) va el texto.
  const share = async () => {
    if (match) {
      await cardShare.share({
        kind: 'game',
        pct: match.pct,
        matches: match.matches,
        total: match.total,
        gameName: GAMES[round.game].name,
      });
      return;
    }
    try {
      await Share.share({
        message: roundShareText(round, { me: meName, partner: partnerName }),
      });
    } catch {
      // Sin hoja de compartir (web) o cancelado: no pasa nada.
    }
  };
  const next = () =>
    again.mutate(
      { game: round.game, spicy: round.spicy },
      {
        onSuccess: (r) => {
          haptic.light();
          router.replace({ pathname: '/game/[id]', params: { id: r.id } });
        },
        onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }),
      },
    );

  return (
    <View style={{ gap: spacing.xl }}>
      {match ? (
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" tone="muted">
            Coincidieron
          </Text>
          <Text variant="display" accessibilityLabel={`${match.pct} por ciento de coincidencia`}>
            {match.pct}%
          </Text>
          <Text variant="h3">{matchHeadline(match.pct)}</Text>
          <Text variant="note" tone="muted">
            Coincidieron en {match.matches} de {match.total}.
          </Text>
        </View>
      ) : null}

      <View>
        <Divider />
        {round.items.map((item) => (
          <View key={item.id}>
            <ResultRow round={round} item={item} />
            <Divider />
          </View>
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        <Button title="Otra ronda" fullWidth onPress={next} loading={again.isPending} />
        <Button
          title="Compartir"
          variant="secondary"
          fullWidth
          loading={cardShare.sharing}
          onPress={() => void share()}
        />
      </View>
      {cardShare.host}
    </View>
  );
}

/** Pantalla `/game/<id>`: jugar la ronda, esperar a la pareja y ver los resultados. */
export function GameRoundView({ id }: { id: string }) {
  const { spacing } = useTheme();
  const toast = useToast();
  const goBack = useGoBack();
  const { round, isLoading, isError, error, refetch, isRefetching } = useGameRound(id);
  const remove = useDeleteGameRound();
  const [confirm, setConfirm] = useState(false);

  // Háptica de éxito cuando la ronda se completa estando en la pantalla.
  const wasPlaying = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (round.status === 'finished' && wasPlaying.current) haptic.success();
    wasPlaying.current = round.status === 'playing';
  }, [round]);

  if (isLoading) return <LoadingPage label="Cargando la ronda" />;
  if (isError || !round) {
    return (
      <ErrorPage
        error={error}
        gone={!isError || isGone(error, 'round_not_found')}
        goneTitle="Esa ronda ya no está"
        loadTitle="No pudimos abrir la ronda"
        onRetry={() => void refetch()}
      />
    );
  }

  const info = GAMES[round.game];
  const turn = roundTurn(round);
  const abandon = () =>
    remove.mutate(round.id, {
      onSuccess: () => {
        setConfirm(false);
        goBack();
      },
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }),
    });

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View style={{ gap: spacing.lg }}>
        <BackBar />
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" tone="muted">
            {round.spicy ? 'Versión picante' : turn === 'finished' ? 'Resultados' : 'Ronda'}
          </Text>
          <Text variant="h1" accessibilityRole="header">
            {info.name}
          </Text>
        </View>

        {turn === 'my_turn' ? <Playing round={round} /> : null}
        {turn === 'waiting_partner' ? <Waiting round={round} /> : null}
        {turn === 'finished' ? <Finished round={round} /> : null}

        {turn !== 'finished' ? (
          <View style={{ alignItems: 'flex-start' }}>
            <Button title="Dejar la ronda" variant="ghost" onPress={() => setConfirm(true)} />
          </View>
        ) : null}
      </View>

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="¿Dejar esta ronda?">
        <View style={{ gap: spacing.lg }}>
          <Text variant="body" tone="muted">
            La ronda se borra para los dos, con todo lo que han contestado. Después pueden empezar
            otra.
          </Text>
          <Button
            title="Dejarla"
            variant="danger"
            fullWidth
            onPress={abandon}
            loading={remove.isPending}
          />
          <Button title="Mejor no" variant="ghost" fullWidth onPress={() => setConfirm(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}

import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  Button,
  Card,
  Divider,
  Doodle,
  Icon,
  Screen,
  Sheet,
  Stamp,
  Tally,
  Text,
  WaitingIllustration,
  useStickIn,
  useToast,
} from '@/components';
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
import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

import { useAnswerGameItem, useDeleteGameRound, useGameRound, useStartGameRound } from '../hooks';
import { useNames } from './useNames';
import { BackBar, ErrorPage, LoadingPage, isGone, useGoBack } from './ui';

/** Ficha grande del ítem que se "pega" al llegar (DISENO §5). */
function ItemCard({ item }: { item: GameItem }) {
  const { spacing } = useTheme();
  const stick = useStickIn(tiltFor(item.id, 1));
  return (
    <Animated.View style={stick}>
      <Card>
        <View style={{ minHeight: spacing.xxxl * 2, justifyContent: 'center' }}>
          <Text variant={item.text.length > 120 ? 'heading' : 'title'}>{item.text}</Text>
        </View>
      </Card>
    </Animated.View>
  );
}

/** Respuesta grande como papelito post-it. */
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

function Playing({ round }: { round: GameRound }) {
  const { spacing } = useTheme();
  const toast = useToast();
  const { partnerName } = useNames();
  const answer = useAnswerGameItem(round.id);
  const item = nextItem(round);
  if (!item) return null;
  const labels = answerLabels(round.game, item, partnerName);

  const choose = (choice: 0 | 1) => {
    haptic.stick();
    answer.mutate(
      { questionId: item.id, choice },
      { onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }) },
    );
  };

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="small" muted>
          {Math.min(round.my_count + 1, round.total)} de {round.total}
        </Text>
        <Tally
          total={round.total}
          count={round.my_count}
          accessibilityLabel={`${round.my_count} de ${round.total} contestadas`}
        />
      </View>
      <ItemCard key={item.id} item={item} />
      <View style={{ gap: spacing.lg }}>
        <Papelito
          label={labels[0]}
          tone="postit"
          tilt={-1.5}
          disabled={answer.isPending}
          onPress={() => choose(0)}
        />
        <Papelito
          label={labels[1]}
          tone="mint"
          tilt={1.5}
          disabled={answer.isPending}
          onPress={() => choose(1)}
        />
      </View>
    </View>
  );
}

function Waiting({ round }: { round: GameRound }) {
  const { spacing } = useTheme();
  const { partnerName } = useNames();
  return (
    <View style={{ gap: spacing.lg, alignItems: 'flex-start' }}>
      <WaitingIllustration />
      <Text variant="title" accessibilityRole="header">
        Ya quedó tu parte
      </Text>
      <Text variant="body" muted>
        Falta {partnerName} ({round.partner_count}/{round.total}). Cuando termine, aquí aparece
        cuánto coincidieron.
      </Text>
      <Tally
        total={round.total}
        count={round.partner_count}
        accessibilityLabel={`${partnerName} lleva ${round.partner_count} de ${round.total}`}
      />
    </View>
  );
}

function ResultRow({ round, item }: { round: GameRound; item: GameItem }) {
  const { spacing, colors } = useTheme();
  const { meName, partnerName } = useNames();
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
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="bodyStrong">{item.text}</Text>
        <Text variant="small">
          <Text variant="small" muted>
            Tú:{' '}
          </Text>
          {mineText}
        </Text>
        <Text variant="small">
          <Text variant="small" muted>
            {partnerName}:{' '}
          </Text>
          {partnerText}
        </Text>
      </View>
      <View style={{ width: 28, alignItems: 'center', paddingTop: spacing.xs }}>
        {hit ? <Icon name="check" size={24} color={colors.nopal} /> : null}
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

  const share = async () => {
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
          haptic.stick();
          router.replace({ pathname: '/game/[id]', params: { id: r.id } });
        },
        onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
      },
    );

  return (
    <View style={{ gap: spacing.xl }}>
      {match ? (
        <View style={{ gap: spacing.md, alignItems: 'flex-start' }}>
          <View style={{ width: 160, height: 76, alignItems: 'center', justifyContent: 'center' }}>
            <Text
              variant="hero"
              accessibilityLabel={`${match.pct} por ciento de coincidencia`}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {match.pct}%
            </Text>
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0 }}>
              <Doodle kind="circle" width={160} height={76} />
            </View>
          </View>
          <Text variant="hand">{matchHeadline(match.pct)}</Text>
          <Text variant="small" muted>
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

      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <Button title="Compartir" variant="secondary" onPress={() => void share()} />
        <Button title="Otra ronda" onPress={next} loading={again.isPending} />
      </View>
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
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
    });

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View style={{ gap: spacing.lg }}>
        <BackBar />
        <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
          <Stamp tone={round.spicy ? 'jamaica' : 'ink'}>
            {round.spicy ? 'VERSIÓN PICANTE' : turn === 'finished' ? 'RESULTADOS' : 'RONDA'}
          </Stamp>
          <Text variant="display" accessibilityRole="header">
            {info.name}
          </Text>
        </View>

        {turn === 'my_turn' ? <Playing round={round} /> : null}
        {turn === 'waiting_partner' ? <Waiting round={round} /> : null}
        {turn === 'finished' ? <Finished round={round} /> : null}

        {turn !== 'finished' ? (
          <Button title="Abandonar ronda" variant="ghost" onPress={() => setConfirm(true)} />
        ) : null}
      </View>

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="¿Abandonar esta ronda?">
        <View style={{ gap: spacing.lg }}>
          <Text variant="body" muted>
            La ronda se borra para los dos, con todo lo que han contestado. Después pueden empezar
            otra.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Button title="Abandonar" onPress={abandon} loading={remove.isPending} />
            <Button title="Mejor no" variant="ghost" onPress={() => setConfirm(false)} />
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

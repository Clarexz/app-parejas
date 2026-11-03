import { Pressable, View } from 'react-native';

import { Avatar, Icon, Text } from '@/components';
import { useCouple } from '@/features/couple';
import { useSignedUrl } from '@/features/profile';
import { useTheme } from '@/theme';

import { groupActive } from '../group';
import { useActiveStories } from '../hooks';

type Props = {
  myName: string;
  myAvatar?: string | null;
  partnerName: string;
  partnerAvatar?: string | null;
  /** Cuántas stories activas tengo. */
  mineCount: number;
  /** Cuántas stories activas tiene mi pareja y cuántas no he visto. */
  partnerCount: number;
  partnerUnseen: number;
  /** Sin pareja todavía: no se muestra su círculo. */
  hasPartner?: boolean;
  loading?: boolean;
  /** Tu círculo (lleva el "+"): abre "crear" o, si tienes stories, el visor con las tuyas. */
  onPressMine: () => void;
  onPressPartner: () => void;
};

/**
 * Los dos círculos de stories (DISENO §8): tu pareja con el aro de su fruta (y punto si hay una
 * nueva) y tú con el aro de la tuya y un "+" para crear.
 */
export function StoriesRowView({
  myName,
  myAvatar,
  partnerName,
  partnerAvatar,
  mineCount,
  partnerCount,
  partnerUnseen,
  hasPartner = true,
  loading = false,
  onPressMine,
  onPressPartner,
}: Props) {
  const { colors, spacing, radius, fruit } = useTheme();
  const partnerHas = partnerCount > 0;
  const mineHas = mineCount > 0;
  const partnerFruit = fruit.partner ?? fruit.me;

  const mineLabel = mineHas
    ? `Tu story, ${mineCount === 1 ? '1 activa' : `${mineCount} activas`}`
    : 'Crear una story';
  const partnerLabel = partnerHas
    ? partnerUnseen > 0
      ? `Story nueva de ${partnerName}`
      : `Story de ${partnerName}`
    : `${partnerName} no tiene story`;

  return (
    <View style={{ flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' }}>
      {hasPartner ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={partnerLabel}
          accessibilityState={{ disabled: !partnerHas }}
          onPress={onPressPartner}
          disabled={!partnerHas || loading}
          style={({ pressed }) => ({
            width: 88,
            alignItems: 'center',
            gap: spacing.xs,
            opacity: partnerHas ? (pressed ? 0.7 : 1) : 0.6,
          })}
        >
          <Avatar
            name={partnerName}
            source={partnerAvatar ?? undefined}
            size={80}
            fruit={partnerFruit}
            ring={partnerHas}
            newDot={partnerUnseen > 0}
          />
          <Text variant="ui" numberOfLines={1} style={{ marginTop: spacing.xs }}>
            {partnerName}
          </Text>
          <Text variant="note" tone="muted" numberOfLines={1}>
            {partnerHas ? (partnerUnseen > 0 ? 'Nueva' : 'Ya la viste') : 'Nada hoy'}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={mineLabel}
        accessibilityHint={mineHas ? 'Ver tus stories' : 'Abre las opciones para crear una story'}
        onPress={onPressMine}
        disabled={loading}
        style={({ pressed }) => ({
          width: 88,
          alignItems: 'center',
          gap: spacing.xs,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View>
          <Avatar
            name={myName}
            source={myAvatar ?? undefined}
            size={80}
            fruit={fruit.me}
            ring={mineHas}
          />
          {!loading ? (
            <View
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 32,
                height: 32,
                borderRadius: radius.pill,
                backgroundColor: colors.action,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: colors.bg,
              }}
            >
              <Icon name="plus" size={18} color={colors.onAction} />
            </View>
          ) : null}
        </View>
        <Text variant="ui" numberOfLines={1} style={{ marginTop: spacing.xs }}>
          Tú
        </Text>
        <Text variant="note" tone="muted" numberOfLines={1}>
          {mineHas ? (mineCount === 1 ? '1 activa' : `${mineCount} activas`) : 'Crear'}
        </Text>
      </Pressable>
    </View>
  );
}

/** Los círculos conectados a las stories activas y a la pareja. */
export function StoriesRow({
  onOpen,
  onCreate,
}: {
  onOpen: (userId: string) => void;
  onCreate: () => void;
}) {
  const { me, partner } = useCouple();
  const { stories, isLoading } = useActiveStories();
  const myAvatar = useSignedUrl(me?.avatar_path);
  const partnerAvatar = useSignedUrl(partner?.avatar_path);

  const groups = groupActive(stories, me?.id, partner?.id);

  return (
    <StoriesRowView
      myName={me?.nickname || me?.display_name || 'Tú'}
      myAvatar={myAvatar}
      partnerName={partner?.nickname || partner?.display_name || 'Tu pareja'}
      partnerAvatar={partnerAvatar}
      mineCount={groups.mine.length}
      partnerCount={groups.partner.length}
      partnerUnseen={groups.partnerUnseen}
      hasPartner={!!partner}
      loading={isLoading}
      onPressMine={() => (groups.mine.length && me ? onOpen(me.id) : onCreate())}
      onPressPartner={() => partner && onOpen(partner.id)}
    />
  );
}

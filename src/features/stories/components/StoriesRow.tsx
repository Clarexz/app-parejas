import { Pressable, View } from 'react-native';

import { Avatar, Icon, Stamp, Text } from '@/components';
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
  /** Sin pareja todavía: no se muestra su polaroid. */
  hasPartner?: boolean;
  loading?: boolean;
  /** Sin tener story activa abre "crear"; si tienes, el visor con las tuyas. */
  onPressMine: () => void;
  onPressPartner: () => void;
};

/**
 * La fila de stories de Inicio (DISENO §8): dos mini polaroids. "Tú" lleva un sticker `plus` si
 * no tienes story activa; tu pareja, un sello NUEVA si tiene sin ver, o se apaga ("sin story").
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
  const { colors, spacing, radius, shadows } = useTheme();
  const partnerHas = partnerCount > 0;
  const mineHas = mineCount > 0;

  const mineLabel = mineHas
    ? `Tu story, ${mineCount === 1 ? '1 activa' : `${mineCount} activas`}`
    : 'Pega una story';
  const partnerLabel = partnerHas
    ? partnerUnseen > 0
      ? `Story nueva de ${partnerName}`
      : `Story de ${partnerName}`
    : `${partnerName} no tiene story`;

  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="heading" accessibilityRole="header">
        Stories de hoy
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mineLabel}
          accessibilityHint={mineHas ? 'Ver tus stories' : 'Abre la hoja para pegar una story'}
          onPress={onPressMine}
          disabled={loading}
          style={({ pressed }) => ({ width: 84, gap: spacing.sm, opacity: pressed ? 0.7 : 1 })}
        >
          <View>
            <Avatar variant="polaroid" name={myName} source={myAvatar ?? undefined} size={76} />
            {!mineHas && !loading ? (
              <View
                style={{
                  position: 'absolute',
                  right: -6,
                  bottom: 14,
                  width: 28,
                  height: 28,
                  borderRadius: radius.pill,
                  backgroundColor: colors.jamaica,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.polaroid,
                  boxShadow: shadows.object,
                }}
              >
                <Icon name="plus" size={16} color={colors.onJamaica} />
              </View>
            ) : null}
          </View>
          <Text variant="handSmall" numberOfLines={1} tone={mineHas ? 'ink' : 'muted'}>
            {mineHas ? 'Tu story' : 'Pega la tuya'}
          </Text>
        </Pressable>

        {hasPartner ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={partnerLabel}
            accessibilityState={{ disabled: !partnerHas }}
            onPress={onPressPartner}
            disabled={!partnerHas || loading}
            style={({ pressed }) => ({
              width: 84,
              gap: spacing.sm,
              opacity: partnerHas ? (pressed ? 0.7 : 1) : 0.5,
            })}
          >
            <View>
              <Avatar
                variant="polaroid"
                name={partnerName}
                source={partnerAvatar ?? undefined}
                size={76}
              />
              {partnerUnseen > 0 ? (
                <Stamp
                  style={{
                    position: 'absolute',
                    right: -10,
                    top: -6,
                    backgroundColor: colors.paper,
                  }}
                >
                  NUEVA
                </Stamp>
              ) : null}
            </View>
            <Text variant="handSmall" numberOfLines={1} tone={partnerHas ? 'ink' : 'muted'}>
              {partnerHas ? partnerName : 'sin story'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** La fila conectada a las stories activas y a la pareja. */
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

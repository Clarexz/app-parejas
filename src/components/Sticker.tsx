import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { useStickIn } from './motion';
import { Text } from './Text';

export type StickerTone = 'jamaica' | 'cempasuchil' | 'nopal' | 'postit';

type Props = {
  /** Texto corto a mano. */
  label?: string;
  icon?: IconName;
  /** Solo para el mood que escribe un usuario (DISENO §3). */
  emoji?: string;
  tone?: StickerTone;
  tilt?: number;
  style?: StyleProp<ViewStyle>;
};

/** Sticker troquelado: borde blanco grueso y sombra de objeto (DISENO §7). */
export function Sticker({ label, icon, emoji, tone = 'postit', tilt = 3, style }: Props) {
  const { colors, spacing, radius, shadows } = useTheme();
  const animated = useStickIn(tilt);
  const bg = colors[tone];
  const fg =
    tone === 'postit' ? colors.onPostit : tone === 'jamaica' ? colors.onJamaica : colors.onPolaroid;
  return (
    <Animated.View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: colors.polaroid,
          padding: spacing.xs,
          borderRadius: radius.sm + 4,
          boxShadow: shadows.object,
        },
        animated,
        style,
      ]}
    >
      <View
        style={{
          backgroundColor: bg,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          minHeight: 24,
          minWidth: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
        }}
      >
        {icon ? <Icon name={icon} size={20} color={fg} /> : null}
        {emoji ? (
          <Text variant="hand" style={{ color: fg }}>
            {emoji}
          </Text>
        ) : null}
        {label ? (
          <Text variant="handSmall" style={{ color: fg }}>
            {label}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

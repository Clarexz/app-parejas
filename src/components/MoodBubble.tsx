import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { LoadingSymbol } from './LoadingSymbol';
import { fruitOf, type FruitLike } from './Symbol';
import { Text } from './Text';

type Props = {
  /** Fruta de quien la dice: pone el tinte. */
  fruit: FruitLike;
  /** Emoji del mood (contenido del usuario, no ícono del sistema). */
  emoji?: string;
  /** Nombre del mood: "feliz". */
  mood?: string;
  /** Línea de abajo: "Ximena · hace 5 min", o la nota que escribió. */
  note?: string;
  /** Contorno `line` sin mood: "¿Y tú?". */
  empty?: boolean;
  emptyTitle?: string;
  emptyNote?: string;
  loading?: boolean;
  /** Sube cuando llega un mood nuevo: la burbuja "llega" (resorte; fundido con reducir movimiento). */
  pulse?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Burbuja con pico arriba en el tinte de la fruta: emoji + mood + nota (DISENO §7). */
export function MoodBubble({
  fruit,
  emoji,
  mood,
  note,
  empty = false,
  emptyTitle = '¿Y tú?',
  emptyNote = 'Toca para elegir',
  loading = false,
  pulse = 0,
  onPress,
  accessibilityLabel,
}: Props) {
  const { colors, spacing, tint, motion } = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const fade = useSharedValue(1);
  useEffect(() => {
    if (pulse === 0) return;
    if (reduced) {
      fade.value = 0.3;
      fade.value = withTiming(1, { duration: motion.reduced });
      return;
    }
    scale.value = 0.94;
    scale.value = withSpring(1, motion.spring);
  }, [pulse, reduced, scale, fade, motion]);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: scale.value }],
  }));
  const bg = empty || loading ? 'transparent' : tint(fruitOf(fruit));
  const title = empty ? emptyTitle : [emoji, mood].filter(Boolean).join(' ');
  const sub = empty ? emptyNote : note;
  const label = accessibilityLabel ?? [title, sub].filter(Boolean).join('. ');

  const body = (
    <View
      style={{
        marginTop: 7,
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 14,
        gap: 2,
        minHeight: 56,
        justifyContent: 'center',
        backgroundColor: bg,
        borderWidth: empty || loading ? 2 : 0,
        borderColor: colors.line,
      }}
    >
      {!empty && !loading ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 18,
            top: -7,
            width: 16,
            height: 16,
            borderRadius: 3,
            backgroundColor: bg,
            transform: [{ rotate: '45deg' }],
          }}
        />
      ) : null}
      {loading ? (
        <View style={{ alignItems: 'flex-start' }}>
          <LoadingSymbol size={24} />
        </View>
      ) : (
        <>
          <Text variant="bodyStrong" numberOfLines={1} style={{ fontSize: 16, lineHeight: 22 }}>
            {title}
          </Text>
          {sub ? (
            <Text variant="note" tone="muted">
              {sub}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );

  const animated = <Animated.View style={pulseStyle}>{body}</Animated.View>;
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={{ paddingTop: spacing.xxs }}>
        {animated}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      {animated}
    </Pressable>
  );
}

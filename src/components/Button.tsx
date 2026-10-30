import { useEffect, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

import { Doodle } from './Doodle';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const SCRIBBLE_LENGTH = 52;

/** Lápiz garabateando: un trazo que se dibuja en bucle (reemplaza al spinner). */
function Scribble({ color }: { color: string }) {
  const reduced = useReducedMotion();
  const offset = useSharedValue(reduced ? 0 : SCRIBBLE_LENGTH);
  useEffect(() => {
    if (reduced) return;
    offset.value = withRepeat(
      withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [reduced, offset]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  return (
    <Svg width={32} height={16} viewBox="0 0 32 16" fill="none" accessibilityElementsHidden>
      <AnimatedPath
        d="M2 12 C5 2 9 2 11 9 S17 15 20 6 S27 3 30 9"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={[SCRIBBLE_LENGTH, SCRIBBLE_LENGTH]}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  /** Ocupa todo el ancho (auth y onboarding, DISENO §8). */
  fullWidth?: boolean;
};

/** Botón del sistema (DISENO §7): primario recortado a mano, secundario de contorno, ghost subrayado. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
}: Props) {
  const { colors, spacing, radius, shadows, motion, type } = useTheme();
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const [pressed, setPressed] = useState(false);
  const [textWidth, setTextWidth] = useState(0);

  const inactive = disabled || loading;
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: 2 * press.value }, { translateY: 2 * press.value }],
  }));
  const set = (v: number) => {
    setPressed(v === 1);
    press.value = reduced ? v : withTiming(v, { duration: motion.duration.fast });
  };

  const primary = variant === 'primary';
  const secondary = variant === 'secondary';
  const fg = primary
    ? disabled
      ? colors.paperRaised
      : colors.onJamaica
    : disabled
      ? colors.inkFaint
      : secondary
        ? colors.ink
        : colors.jamaica;
  const labelStyle = primary ? type.hand : type.bodyStrong;

  const visual = primary
    ? {
        backgroundColor: disabled ? colors.inkFaint : colors.jamaica,
        borderTopLeftRadius: radius.hand.tl,
        borderTopRightRadius: radius.hand.tr,
        borderBottomRightRadius: radius.hand.br,
        borderBottomLeftRadius: radius.hand.bl,
        boxShadow: inactive || pressed ? undefined : shadows.ink,
      }
    : secondary
      ? {
          borderWidth: 1.5,
          borderColor: disabled ? colors.inkFaint : colors.ink,
          borderRadius: radius.sm,
        }
      : {};

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => set(1)}
      onPressOut={() => set(0)}
      // Deja espacio para la sombra "dibujada" (2/3 dp) y para que no se recorte al hundirse.
      style={{
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        paddingRight: primary ? 2 : 0,
        paddingBottom: primary ? 3 : 0,
      }}
    >
      <Animated.View
        style={[
          {
            minHeight: 48,
            minWidth: 48,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.sm,
            opacity: !primary && pressed ? 0.7 : 1,
          },
          visual,
          animated,
        ]}
      >
        {loading ? (
          <Scribble color={fg} />
        ) : (
          <>
            {icon ? <Icon name={icon} size={20} color={fg} /> : null}
            <View onLayout={(e: LayoutChangeEvent) => setTextWidth(e.nativeEvent.layout.width)}>
              <Text variant="bodyStrong" style={[labelStyle, { color: fg }]}>
                {title}
              </Text>
              {variant === 'ghost' && textWidth > 0 && !disabled ? (
                <Doodle
                  kind="underline"
                  width={textWidth}
                  height={10}
                  style={{ position: 'absolute', left: 0, bottom: -6 }}
                />
              ) : null}
            </View>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

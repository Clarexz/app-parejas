import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { darkColors } from '@/theme';

type Props = {
  /** Cuántas stories hay (un renglón por story). */
  count: number;
  /** Cuál se está viendo (0-based). */
  index: number;
  /** Cuánto dura la actual, en ms. */
  durationMs: number;
  /** Con `true` el tiempo se detiene (mantener pulsado, escribir, hoja abierta). */
  paused?: boolean;
  /** Color (hex) de la fruta de quien publicó: el relleno de la barra. */
  color: string;
  /** La actual terminó de llenarse. */
  onComplete: () => void;
};

const HEIGHT = 4;

/**
 * Barras arriba del visor: las vistas quedan llenas, la actual se llena en la fruta de quien
 * publicó según el tiempo. Vive sobre el fondo de noche del visor, por eso usa la paleta nocturna.
 * Con "reducir movimiento" el actual no se anima: se resalta completo y el avance sigue en tiempo.
 */
export function StoryProgress({
  count,
  index,
  durationMs,
  paused = false,
  color,
  onComplete,
}: Props) {
  const reduced = useReducedMotion();
  const fill = useSharedValue(0);
  const elapsed = useRef(0);
  const startedAt = useRef<number | null>(null);
  const done = useRef(onComplete);
  useEffect(() => {
    done.current = onComplete;
  });

  // Otra story: se vuelve a empezar.
  useEffect(() => {
    elapsed.current = 0;
    startedAt.current = null;
    cancelAnimation(fill);
    fill.set(0);
  }, [index, durationMs, fill]);

  useEffect(() => {
    const remaining = Math.max(0, durationMs - elapsed.current);
    if (paused) {
      cancelAnimation(fill);
      return;
    }
    if (reduced) {
      startedAt.current = Date.now();
      const timer = setTimeout(() => done.current(), remaining);
      return () => {
        clearTimeout(timer);
        if (startedAt.current != null) elapsed.current += Date.now() - startedAt.current;
        startedAt.current = null;
      };
    }
    fill.set(
      withTiming(1, { duration: remaining, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(done.current)();
      }),
    );
    return () => {
      cancelAnimation(fill);
      elapsed.current = fill.get() * durationMs;
    };
  }, [paused, reduced, index, durationMs, fill]);

  const currentStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Story ${index + 1} de ${count}`}
      style={{ flexDirection: 'row', gap: 4 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: HEIGHT,
            backgroundColor: darkColors.surface2,
            borderRadius: HEIGHT,
            overflow: 'hidden',
          }}
        >
          {i < index ? (
            <View style={{ flex: 1, backgroundColor: color }} />
          ) : i === index ? (
            reduced ? (
              <View style={{ flex: 1, backgroundColor: color }} />
            ) : (
              <Animated.View style={[{ height: HEIGHT, backgroundColor: color }, currentStyle]} />
            )
          ) : null}
        </View>
      ))}
    </View>
  );
}

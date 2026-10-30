import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { useStickIn } from './motion';
import { Text } from './Text';

export type ToastTone = 'info' | 'success' | 'error';
export type ToastOptions = { message: string; tone?: ToastTone };

const DURATION = 3500;

type Ctx = { show: (options: ToastOptions) => void };
const ToastContext = createContext<Ctx | null>(null);

/** Muestra avisos tipo post-it. Requiere `ToastProvider` arriba en el árbol. */
export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

/** Post-it que se pega arriba (DISENO §7). */
export function Toast({ message, tone = 'info' }: ToastOptions) {
  const { colors, spacing, radius, shadows } = useTheme();
  const animated = useStickIn(-1);
  const accent = { info: colors.onPostit, success: colors.nopal, error: colors.chile }[tone];
  const icon: IconName = { info: 'bell', success: 'check', error: 'cloudOff' }[tone] as IconName;
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        {
          backgroundColor: colors.postit,
          borderRadius: radius.none,
          borderLeftWidth: tone === 'info' ? 0 : 4,
          borderLeftColor: accent,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          boxShadow: shadows.object,
        },
        animated,
      ]}
    >
      <Icon name={icon} size={24} color={accent} />
      <Text variant="hand" style={{ color: colors.onPostit, flexShrink: 1 }}>
        {message}
      </Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { spacing, page } = useTheme();
  const [current, setCurrent] = useState<(ToastOptions & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const show = useCallback((options: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    counter.current += 1;
    setCurrent({ ...options, key: counter.current });
    haptic.stick();
    timer.current = setTimeout(() => setCurrent(null), DURATION);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {current ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: insets.top + spacing.sm,
            left: page.contentLeft - spacing.sm,
            right: page.contentRight,
            alignItems: 'flex-start',
          }}
        >
          <Toast key={current.key} message={current.message} tone={current.tone} />
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

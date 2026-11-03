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
import { useArrive } from './motion';
import { Text } from './Text';

/** `error` es el nombre viejo de `danger`. */
export type ToastTone = 'info' | 'success' | 'danger' | 'error';
export type ToastOptions = { message: string; tone?: ToastTone };

const DURATION = 3500;

type Ctx = { show: (options: ToastOptions) => void };
const ToastContext = createContext<Ctx | null>(null);

/** Muestra avisos breves. Requiere `ToastProvider` arriba en el árbol. */
export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

/** Píldora `ink` con texto `bg` y un ícono; el color solo acompaña al ícono (DISENO §7). */
export function Toast({ message, tone = 'info' }: ToastOptions) {
  const { colors, spacing, radius, shadows } = useTheme();
  const animated = useArrive();
  const danger = tone === 'danger' || tone === 'error';
  // El ícono va sobre `ink`: usa las versiones del modo contrario, que sí contrastan ahí.
  const iconColor = danger
    ? colors.dangerOnInk
    : tone === 'success'
      ? colors.successOnInk
      : colors.bg;
  const icon: IconName = danger ? 'alert' : tone === 'success' ? 'check' : 'bell';
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        {
          backgroundColor: colors.ink,
          borderRadius: radius.pill,
          paddingVertical: spacing.md,
          paddingLeft: spacing.lg,
          paddingRight: spacing.xl - 2,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          maxWidth: '100%',
          boxShadow: shadows.float,
        },
        animated,
      ]}
    >
      <Icon name={icon} size={24} color={iconColor} />
      <Text variant="ui" style={{ color: colors.bg, flexShrink: 1 }}>
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
    haptic.light();
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
            left: page.gutter,
            right: page.gutter,
            alignItems: 'center',
          }}
        >
          <Toast key={current.key} message={current.message} tone={current.tone} />
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

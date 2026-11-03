import type { Tabs } from 'expo-router';
import { useEffect, type ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';

/** Props que `Tabs` entrega a su `tabBar` (equivale a `BottomTabBarProps`). */
export type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Ícono por ruta de pestaña (DISENO §8): Inicio · Pregunta · Stories · Memorias · Más. */
export const TAB_ICONS: Record<string, IconName> = {
  index: 'home',
  questions: 'question',
  stories: 'stories',
  memories: 'memories',
  more: 'more',
};

/** El círculo de fruta crece de 0.6 a 1 con `spring` al activarse (DISENO §5). */
function ActiveCircle({ active }: { active: boolean }) {
  const { fruit, motion, radius } = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(active ? 1 : 0.6);
  const fade = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      scale.value = 1;
      fade.value = withTiming(active ? 1 : 0, { duration: motion.reduced });
      return;
    }
    fade.value = withTiming(active ? 1 : 0, { duration: motion.tap.duration });
    scale.value = active ? withSpring(1, motion.spring) : 0.6;
  }, [active, reduced, scale, fade, motion]);
  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: fruit.me.hex,
        },
        style,
      ]}
    />
  );
}

/**
 * Barra de pestañas (DISENO §7): 5 íconos sin texto visible, con `accessibilityLabel`; la activa
 * es un círculo de tu fruta con el ícono encima. Se pasa a
 * `<Tabs tabBar={(p) => <TabBar {...p} />} />`.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: TabBarProps) {
  const { colors, fruit } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.bg,
        paddingBottom: insets.bottom,
        borderTopWidth: 1,
        borderTopColor: colors.line,
      }}
    >
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 72,
          paddingHorizontal: 18,
          paddingBottom: 10,
          paddingTop: 10,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options.title ?? route.name);
          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              haptic.light();
              navigateToTab(route.key);
            }
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed && !focused ? 0.6 : 1,
              })}
            >
              <ActiveCircle active={focused} />
              {/* zIndex: el círculo es `absolute` y en web pintaría encima de un hermano estático. */}
              <View pointerEvents="none" style={{ zIndex: 1 }}>
                <Icon
                  name={TAB_ICONS[route.name] ?? 'more'}
                  size={24}
                  color={focused ? fruit.me.on : colors.ink}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

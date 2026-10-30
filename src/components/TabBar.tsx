import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { Divider } from './Divider';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** Props que `Tabs` entrega a su `tabBar` (equivale a `BottomTabBarProps`). */
export type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Icono sugerido por ruta de pestaña (las de Fase 2 quedan listas). */
export const TAB_ICONS: Record<string, IconName> = {
  index: 'home',
  questions: 'ask',
  stories: 'photo',
  memories: 'map',
  more: 'more',
};

/**
 * Barra de pestañas "Bitácora" (DISENO §8): fondo `paper`, línea superior punteada, etiquetas
 * `handSmall`, activo en Jamaica. Se pasa a `<Tabs tabBar={(p) => <TabBar {...p} />} />`.
 * Los iconos salen de `TAB_ICONS` o de `options.tabBarIcon` si no es una función.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: TabBarProps) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.paper,
        paddingBottom: insets.bottom,
      }}
    >
      <Divider />
      <View accessibilityRole="tablist" style={{ flexDirection: 'row' }}>
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options.title ?? route.name);
          const color = focused ? colors.jamaica : colors.inkMuted;
          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
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
                flex: 1,
                minHeight: 56,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xxs,
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Icon name={TAB_ICONS[route.name] ?? 'list'} size={24} color={color} />
              <Text variant="handSmall" style={{ color }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

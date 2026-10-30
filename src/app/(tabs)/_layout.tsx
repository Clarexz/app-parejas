import { Tabs } from 'expo-router';

import { TabBar } from '@/components';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="questions" options={{ title: 'Preguntas' }} />
      <Tabs.Screen name="stories" options={{ title: 'Stories' }} />
      <Tabs.Screen name="memories" options={{ title: 'Memorias' }} />
      <Tabs.Screen name="more" options={{ title: 'Más' }} />
    </Tabs>
  );
}

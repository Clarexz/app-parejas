import { CourierPrime_400Regular, CourierPrime_700Bold } from '@expo-google-fonts/courier-prime';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { GochiHand_400Regular } from '@expo-google-fonts/gochi-hand';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '@/components';
import { ToastProvider } from '@/components/Toast';
import { initSessionListener } from '@/features/auth';
import { useCouple, useCoupleRealtime } from '@/features/couple';
import { homeHrefFor, useOnboardingStage } from '@/features/onboarding';
import { MemoriesEvents } from '@/features/memories';
import { NotificationsBridge } from '@/features/notifications';
import { QuestionsEvents } from '@/features/questions';
import { StoriesEvents } from '@/features/stories';
import { WidgetsBridge } from '@/features/widgets';
import { useLocationSync } from '@/features/distance';
import { QueryProvider } from '@/lib/query';
import { ThemeProvider, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

initSessionListener();

/** Mientras se resuelve la sesión/perfil/pareja (después del splash inicial). */
function LoadingView() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.paper,
      }}
    >
      <Text variant="hand" muted>
        Un momento…
      </Text>
    </View>
  );
}

/** Sin UI: manda mi ubicación al abrir la app si activé la distancia (Fase 8). */
function LocationSyncBridge() {
  useLocationSync();
  return null;
}

function ThemedStack({ fontsReady }: { fontsReady: boolean }) {
  const { isDark } = useTheme();
  const { stage } = useOnboardingStage();
  const { couple } = useCouple();
  useCoupleRealtime(couple?.id ?? null);

  const resolved = stage !== 'loading';
  useEffect(() => {
    if (fontsReady && resolved) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady, resolved]);

  const redirectTo = homeHrefFor(stage);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {resolved ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={stage === 'signed_out'} redirectTo={redirectTo}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected
            guard={stage === 'profile' || stage === 'couple' || stage === 'waiting'}
            redirectTo={redirectTo}
          >
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
          <Stack.Protected guard={stage === 'ready'} redirectTo={redirectTo}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings/profile" />
            <Stack.Screen name="settings/couple" />
            <Stack.Screen name="settings/notifications" />
            <Stack.Screen name="moods" />
            <Stack.Screen name="question" />
            <Stack.Screen name="history" />
            <Stack.Screen name="widgets" />
            <Stack.Screen name="category/[slug]" />
            <Stack.Screen
              name="story/new"
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="story/view"
              options={{ presentation: 'fullScreenModal', animation: 'fade' }}
            />
            <Stack.Screen name="story/archive" />
            <Stack.Screen name="memory/[id]" />
            <Stack.Screen
              name="memory/edit"
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="events/index" />
            <Stack.Screen name="events/edit" />
            <Stack.Screen name="lists/index" />
            <Stack.Screen name="lists/[id]" />
            <Stack.Screen name="distance" />
            <Stack.Screen name="games/index" />
            <Stack.Screen name="game/[id]" />
            <Stack.Screen name="drawing/[id]" />
          </Stack.Protected>
          <Stack.Protected guard={stage === 'error'} redirectTo={redirectTo}>
            <Stack.Screen name="error" />
          </Stack.Protected>
          <Stack.Screen name="conexion" />
          <Stack.Screen name="catalogo" />
        </Stack>
      ) : (
        <LoadingView />
      )}
      {stage === 'ready' ? <QuestionsEvents /> : null}
      {stage === 'ready' ? <StoriesEvents /> : null}
      {stage === 'ready' ? <MemoriesEvents /> : null}
      {stage === 'ready' && Platform.OS === 'android' ? <LocationSyncBridge /> : null}
      {stage === 'ready' && Platform.OS === 'android' ? <NotificationsBridge /> : null}
      {Platform.OS === 'android' ? <WidgetsBridge stage={stage} /> : null}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    GochiHand_400Regular,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });
  const ready = fontsLoaded || !!fontError;

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryProvider>
            <ToastProvider>
              <ThemedStack fontsReady={ready} />
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

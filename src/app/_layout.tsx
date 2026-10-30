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
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast';
import { QueryProvider } from '@/lib/query';
import { ThemeProvider, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedStack() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
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

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryProvider>
          <ToastProvider>
            <ThemedStack />
          </ToastProvider>
        </QueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

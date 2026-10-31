import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { IconButton } from '@/components';
import { useTheme } from '@/theme';

/** Volver; si se entró por un aviso (sin historial) cae en Más. */
export function useGoBack() {
  const router = useRouter();
  return () => {
    if (router.canGoBack?.() ?? true) router.back();
    else router.replace('/more');
  };
}

export function BackBar({ onPress }: { onPress?: () => void }) {
  const { spacing } = useTheme();
  const goBack = useGoBack();
  return (
    <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
      <IconButton name="back" accessibilityLabel="Volver" onPress={onPress ?? goBack} />
    </View>
  );
}

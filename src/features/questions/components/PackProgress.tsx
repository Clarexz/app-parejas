import { View } from 'react-native';

import { useTheme } from '@/theme';

/** Barra de avance de un tema: pista `surface2`, relleno `ink` (las frutas no dicen avance). */
export function PackProgress({ value }: { value: number }) {
  const { colors, radius } = useTheme();
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={{ height: 8, borderRadius: radius.pill, backgroundColor: colors.surface2 }}
    >
      <View
        style={{
          width: `${pct}%`,
          height: 8,
          borderRadius: radius.pill,
          backgroundColor: colors.ink,
        }}
      />
    </View>
  );
}

import { View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

/** Media luna del símbolo (viewBox 0 0 100 100), la mitad izquierda. */
const MOON = 'M46 4 A46 46 0 0 0 46 96 Z';
/** Cuántos días antes empieza a llenarse la media luna. */
const SPAN_DAYS = 60;

/** Qué tanto se llenó (0–1) cuando faltan `daysUntil` días. */
export function moonProgress(daysUntil: number): number {
  const left = Math.min(Math.max(daysUntil, 0), SPAN_DAYS);
  return 1 - left / SPAN_DAYS;
}

/**
 * La media luna de tu fruta que se llena de abajo hacia arriba con la fruta de tu pareja
 * conforme se acerca la visita (DISENO §9, widget "La próxima vez").
 */
export function MoonFill({ daysUntil, size = 64 }: { daysUntil: number; size?: number }) {
  const { fruit } = useTheme();
  const partner = fruit.partner ?? fruit.me;
  const filled = 100 * moonProgress(daysUntil);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size * 0.5} height={size} viewBox="0 0 50 100">
        <Defs>
          <ClipPath id="moon-fill-clip">
            <Rect x="0" y={100 - filled} width="50" height={filled} />
          </ClipPath>
        </Defs>
        <Path d={MOON} fill={fruit.me.hex} />
        <Path d={MOON} fill={partner.hex} clipPath="url(#moon-fill-clip)" />
      </Svg>
    </View>
  );
}

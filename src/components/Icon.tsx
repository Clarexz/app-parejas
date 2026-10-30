import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

import { iconPaths } from './icons/paths';

export type IconName = keyof typeof iconPaths;

export const ICON_NAMES = Object.keys(iconPaths) as IconName[];

type Props = { name: IconName; size?: number; color?: string };

/** Icono del set propio (DISENO §3). Color por defecto: `ink`. */
export function Icon({ name, size = 24, color }: Props) {
  const { colors } = useTheme();
  const stroke = color ?? colors.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      {iconPaths[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

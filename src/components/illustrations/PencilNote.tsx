import Svg, { G, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

/** Lápiz sobre una ficha (estados "escribe algo"). ~160×120 dp. */
export function PencilNote({ width = 160, height = 120 }: { width?: number; height?: number }) {
  const { colors } = useTheme();
  const line = {
    stroke: colors.ink,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg width={width} height={height} viewBox="0 0 160 120" accessibilityElementsHidden>
      <G rotation={3} origin="70, 70">
        <Path d="M20 30 L120 28 L121 100 L19 102 Z" fill={colors.paperRaised} {...line} />
        <Path d="M20 44 L120 43" fill="none" stroke={colors.margin} strokeWidth={2} />
        <Path
          d="M30 60 L108 59 M30 74 L100 73 M30 88 L70 87"
          fill="none"
          stroke={colors.ruled}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </G>
      <G>
        <Path d="M96 96 L138 40 L150 49 L108 105 Z" fill={colors.cempasuchil} {...line} />
        <Path d="M96 96 L108 105 L90 112 Z" fill={colors.postit} {...line} />
        <Path d="M91 110 L89.5 112.5 L93 111.5" fill="none" {...line} />
        <Path d="M138 40 L142 34 C145 32 149 35 150 38 L150 49" fill={colors.jamaica} {...line} />
      </G>
    </Svg>
  );
}

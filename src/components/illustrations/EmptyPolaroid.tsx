import Svg, { G, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

/** Polaroid vacía con cinta (estados vacíos de fotos). ~160×120 dp. */
export function EmptyPolaroid({ width = 160, height = 120 }: { width?: number; height?: number }) {
  const { colors } = useTheme();
  const line = {
    stroke: colors.ink,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg width={width} height={height} viewBox="0 0 160 120" accessibilityElementsHidden>
      <G rotation={-5} origin="80, 60">
        <Path d="M45 14 L116 13 L117 108 L44 109 Z" fill={colors.polaroid} {...line} />
        <Path
          d="M53 22 L108 21.5 L108.5 80 L52.5 80.5 Z"
          fill={colors.paper}
          {...line}
          strokeDasharray="5 5"
        />
        <Path
          d="M64 70 L76 52 L85 64 L91 57 L101 70"
          fill="none"
          {...line}
          stroke={colors.inkFaint}
        />
        <Path d="M60 93 C70 90 80 96 92 92" fill="none" {...line} stroke={colors.inkMuted} />
        <Path
          d="M66 7 L98 6 L99 20 L65 21 Z"
          fill={colors.tapeYellow}
          stroke={colors.cempasuchil}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}

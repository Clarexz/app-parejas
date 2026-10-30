import Svg, { G, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

/** Dos tazas, una llena y otra vacía (estado "esperando a tu pareja"). ~160×120 dp. */
export function WaitingIllustration({
  width = 160,
  height = 120,
}: {
  width?: number;
  height?: number;
}) {
  const { colors } = useTheme();
  const line = {
    stroke: colors.ink,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg width={width} height={height} viewBox="0 0 160 120" accessibilityElementsHidden>
      <Path d="M14 104 C50 102 110 106 146 103" fill="none" {...line} stroke={colors.inkMuted} />
      <G rotation={-2} origin="46, 80">
        <Path
          d="M22 56 L24 90 C25 98 64 98 66 90 L68 55 C50 59 38 59 22 56 Z"
          fill={colors.jamaica}
          {...line}
        />
        <Path d="M68 62 C82 60 82 82 66 82" fill="none" {...line} />
        <Path d="M22 56 C38 52 52 52 68 55" fill="none" {...line} />
        <Path
          d="M38 40 C33 34 43 30 38 22 M52 40 C47 34 57 30 52 22"
          fill="none"
          {...line}
          stroke={colors.inkMuted}
        />
      </G>
      <G rotation={3} origin="114, 80">
        <Path
          d="M90 56 L92 90 C93 98 132 98 134 90 L136 55 C118 59 106 59 90 56 Z"
          fill={colors.paperRaised}
          {...line}
          strokeDasharray="6 5"
        />
        <Path d="M136 62 C150 60 150 82 134 82" fill="none" {...line} strokeDasharray="6 5" />
        <Path d="M90 56 C106 52 120 52 136 55" fill="none" {...line} />
        <Path d="M104 76 C110 80 116 80 122 76" fill="none" {...line} stroke={colors.inkFaint} />
      </G>
    </Svg>
  );
}

import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

/** Nube desconectada con enchufe (estado de error de red). ~160×120 dp. */
export function CloudOff({ width = 160, height = 120 }: { width?: number; height?: number }) {
  const { colors } = useTheme();
  const line = {
    stroke: colors.ink,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg width={width} height={height} viewBox="0 0 160 120" accessibilityElementsHidden>
      <Path
        d="M38 76 C20 75 14 58 24 48 C30 41 40 41 46 45 C50 28 70 20 86 28 C98 34 102 44 102 50 C118 48 132 58 128 70 C126 76 120 78 114 77 Z"
        fill={colors.paperRaised}
        {...line}
      />
      <Path d="M44 60 C47 56 52 55 56 57" fill="none" {...line} stroke={colors.inkFaint} />
      <Path d="M80 77 C80 88 76 92 74 98" fill="none" {...line} />
      <Path d="M62 98 L90 97 L88 110 L64 111 Z" fill={colors.nopal} {...line} />
      <Path d="M68 111 L68 116 M84 110 L84 115" fill="none" {...line} />
      <Path d="M100 92 L106 100 L98 104 L104 114" fill="none" {...line} stroke={colors.chile} />
    </Svg>
  );
}

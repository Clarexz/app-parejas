import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

import { iconPaths } from './icons/paths';

type Props = {
  checked: boolean;
  onPress: () => void;
  /** Obligatorio: la casilla no lleva texto propio. */
  accessibilityLabel: string;
  disabled?: boolean;
};

const BOX =
  'M4.6 5.3 C8 5 15 5.2 19.2 4.9 C19.5 8.5 19.3 15 19.4 19.3 C15.5 19.6 8.5 19.4 4.8 19.6 C4.5 15.5 4.7 9 4.6 5.3 Z';

/** Casilla dibujada a pluma (DISENO §7): cuadrito de tinta; tachada lleva la palomita en Jamaica. */
export function Checkbox({ checked, onPress, accessibilityLabel, disabled = false }: Props) {
  const { colors } = useTheme();
  const stroke = disabled ? colors.inkFaint : checked ? colors.inkMuted : colors.ink;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path
          d={BOX}
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {checked ? (
          <Path
            d={iconPaths.check[0]}
            stroke={disabled ? colors.inkFaint : colors.jamaica}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </Svg>
    </Pressable>
  );
}

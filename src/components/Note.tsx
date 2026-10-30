import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

import { useStickIn } from './motion';
import { Tape, type TapeColor } from './Tape';

type Props = {
  children: ReactNode;
  /** Semilla para la inclinación determinista (±2°). */
  id?: string;
  tilt?: number;
  /** Color de cinta; `false` para no llevar cinta. */
  tape?: TapeColor | false;
  style?: StyleProp<ViewStyle>;
};

/** Post-it: nota corta pegada en la hoja (DISENO §7). */
export function Note({ children, id, tilt, tape = 'yellow', style }: Props) {
  const { colors, spacing, radius, shadows } = useTheme();
  const angle = tilt ?? (id ? tiltFor(id, 2) : -1);
  const animated = useStickIn(angle);
  return (
    <Animated.View style={[{ alignSelf: 'flex-start' }, animated, style]}>
      <View
        style={{
          backgroundColor: colors.postit,
          borderRadius: radius.none,
          padding: spacing.md,
          paddingTop: tape ? spacing.lg : spacing.md,
          boxShadow: shadows.object,
        }}
      >
        {children}
      </View>
      {tape ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: -8, alignSelf: 'center', left: 0, right: 0 }}
        >
          <View style={{ alignItems: 'center' }}>
            <Tape color={tape} width={44} height={16} rotate={-3} />
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

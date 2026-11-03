import { View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect, Circle } from 'react-native-svg';

import { FRUITS } from '@/lib/fruits';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { BrandSymbol } from './Symbol';
import { Text } from './Text';

export type EmptyArt = 'symbol' | 'heart' | 'bubble' | 'dome' | 'spark' | 'circles';

type Props = {
  /** Forma de widget o el símbolo, en las frutas de ustedes. */
  art?: EmptyArt;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
};

const HEART =
  'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z';
const BUBBLE =
  'M6 5h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-5l-4 3.5V17H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z';
const SPARK = 'M12 3.5c.8 4.4 3.6 7.2 8 8-4.4.8-7.2 3.6-8 8-.8-4.4-3.6-7.2-8-8 4.4-.8 7.2-3.6 8-8Z';

/** Formas de widget llenas con las frutas de ustedes (me = tú, partner = tu pareja). */
function Art({ art, size = 96 }: { art: EmptyArt; size?: number }) {
  const { fruit } = useTheme();
  const me = fruit.me.hex;
  const partner = (fruit.partner ?? FRUITS[fruit.me.suggested]).hex;
  if (art === 'symbol') return <BrandSymbol size={size} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {art === 'heart' ? (
        <>
          <Defs>
            <ClipPath id="l">
              <Rect x="0" y="0" width="11.5" height="24" />
            </ClipPath>
            <ClipPath id="r">
              <Rect x="12.5" y="0" width="11.5" height="24" />
            </ClipPath>
          </Defs>
          <Path d={HEART} fill={me} clipPath="url(#l)" />
          <Path d={HEART} fill={partner} clipPath="url(#r)" />
        </>
      ) : null}
      {art === 'bubble' ? <Path d={BUBBLE} fill={partner} /> : null}
      {art === 'dome' ? (
        <>
          <Path d="M4 17a8 8 0 0 1 16 0Z" fill={me} />
          <Rect x="3" y="18.5" width="18" height="2" rx="1" fill={partner} />
        </>
      ) : null}
      {art === 'spark' ? <Path d={SPARK} fill={me} /> : null}
      {art === 'circles' ? (
        <>
          <Circle cx="7" cy="12" r="4.6" fill={me} />
          <Circle cx="17" cy="12" r="4.6" fill={partner} />
        </>
      ) : null}
    </Svg>
  );
}

/** Estado vacío con humor y una acción clara (DISENO §7). */
export function EmptyState({ art = 'symbol', title, body, action }: Props) {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
      <View style={{ marginBottom: spacing.sm }}>
        <Art art={art} />
      </View>
      <Text variant="h3" accessibilityRole="header" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {body ? (
        <Text variant="body" tone="muted" style={{ textAlign: 'center', maxWidth: 320 }}>
          {body}
        </Text>
      ) : null}
      {action ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button title={action.label} onPress={action.onPress} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

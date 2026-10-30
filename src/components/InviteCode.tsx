import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { useStickIn } from './motion';
import { Tape } from './Tape';
import { Text } from './Text';

const GROUP = 3;

type Props = {
  /** Código de 6 caracteres. Con `loading` se ignora. */
  code: string;
  onShare?: () => void;
  onCopy?: () => void;
  /** Texto del botón de compartir. */
  shareLabel?: string;
  /** Genera el código: casillas vacías punteadas. */
  loading?: boolean;
};

/** Código "ABC 234" para leerlo en voz alta: letra por letra. */
export function spokenCode(code: string): string {
  return Array.from(code).join(' ');
}

/** Código de invitación como boleto con cinta (DISENO §7). */
export function InviteCode({
  code,
  onShare,
  onCopy,
  shareLabel = 'Compartir código',
  loading = false,
}: Props) {
  const { colors, spacing, radius, shadows, type, fonts } = useTheme();
  const stick = useStickIn(-1);
  const chars = Array.from({ length: GROUP * 2 }, (_, i) => (loading ? '' : (code[i] ?? '')));

  const box = (ch: string, i: number) => (
    <View
      key={i}
      style={{
        width: 40,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: loading ? 0 : 2,
        borderBottomColor: colors.ink,
        borderWidth: loading ? 1.5 : 0,
        borderStyle: loading ? 'dashed' : 'solid',
        borderColor: colors.inkFaint,
        borderRadius: radius.xs,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.monoBold,
          fontSize: type.display.fontSize,
          lineHeight: type.display.lineHeight + spacing.xs,
          letterSpacing: 1,
        }}
      >
        {ch}
      </Text>
    </View>
  );

  return (
    <Animated.View style={[{ alignSelf: 'flex-start' }, stick]}>
      <View
        accessible
        accessibilityLabel={
          loading
            ? 'Generando el código de invitación'
            : `Código de invitación: ${spokenCode(code)}`
        }
        style={{
          backgroundColor: colors.paperRaised,
          borderTopWidth: 2,
          borderTopColor: colors.margin,
          borderRadius: radius.none,
          boxShadow: shadows.object,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xl,
          paddingBottom: spacing.lg,
          gap: spacing.md,
        }}
      >
        <Text variant="stamp" tone="muted">
          Código de invitación
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {chars.slice(0, GROUP).map((c, i) => box(c, i))}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {chars.slice(GROUP).map((c, i) => box(c, i + GROUP))}
          </View>
        </View>
        {onShare || onCopy ? (
          <View style={{ gap: spacing.xs, alignItems: 'flex-start' }}>
            {onShare ? (
              <Button title={shareLabel} icon="send" onPress={onShare} disabled={loading} />
            ) : null}
            {onCopy ? (
              <Button title="Copiar código" variant="ghost" onPress={onCopy} disabled={loading} />
            ) : null}
          </View>
        ) : null}
      </View>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: -8, left: 0, right: 0, alignItems: 'center' }}
      >
        <Tape color="yellow" width={48} height={16} rotate={-3} />
      </View>
    </Animated.View>
  );
}

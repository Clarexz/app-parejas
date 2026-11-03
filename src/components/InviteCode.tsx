import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

const GROUP = 3;

type Props = {
  /** Código de 6 caracteres. Con `loading` se ignora. */
  code: string;
  onShare?: () => void;
  onCopy?: () => void;
  /** Texto del botón de compartir. */
  shareLabel?: string;
  /** Genera el código: casillas vacías. */
  loading?: boolean;
};

/** Código "ABC 234" para leerlo en voz alta: letra por letra. */
export function spokenCode(code: string): string {
  return Array.from(code).join(' ');
}

/** Código de invitación en una tarjeta `surface`, agrupado en dos (DISENO §7). */
export function InviteCode({
  code,
  onShare,
  onCopy,
  shareLabel = 'Compartir código',
  loading = false,
}: Props) {
  const { colors, spacing, radius, fruit } = useTheme();
  const chars = Array.from({ length: GROUP * 2 }, (_, i) => (loading ? '' : (code[i] ?? '')));

  const box = (ch: string, i: number) => (
    <View
      key={i}
      style={{
        width: 40,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.sm,
        backgroundColor: loading ? colors.surface2 : colors.bg,
      }}
    >
      <Text variant="h2">{ch}</Text>
    </View>
  );

  return (
    <View
      accessible
      accessibilityLabel={
        loading ? 'Generando el código de invitación' : `Código de invitación: ${spokenCode(code)}`
      }
      style={{
        alignSelf: 'stretch',
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: 18,
        gap: spacing.md,
      }}
    >
      <Text variant="label" tone="muted">
        Código de invitación
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {chars.slice(0, GROUP).map((c, i) => box(c, i))}
        </View>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fruit.me.hex }} />
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {chars.slice(GROUP).map((c, i) => box(c, i + GROUP))}
        </View>
      </View>
      {onShare || onCopy ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {onShare ? (
            <Button title={shareLabel} icon="send" onPress={onShare} disabled={loading} />
          ) : null}
          {onCopy ? (
            <Button title="Copiar código" variant="secondary" onPress={onCopy} disabled={loading} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

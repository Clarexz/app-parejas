import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandSymbol, Button, Text } from '@/components';
import { useTheme } from '@/theme';

type Props = {
  /** `false`: solo tapa (selector de apps recientes), sin botón ni aviso de huella. */
  locked: boolean;
  busy?: boolean;
  onUnlock: () => void;
};

/** Cubre toda la app mientras está bloqueada. Pide la huella sola al aparecer. */
export function LockScreen({ locked, busy = false, onUnlock }: Props) {
  const { colors, spacing, page } = useTheme();

  useEffect(() => {
    if (locked) onUnlock();
    // Solo al aparecer bloqueada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: colors.bg }]}
      accessibilityViewIsModal
      testID="lock-screen"
    >
      <View style={{ alignItems: 'center', gap: spacing.xl, paddingHorizontal: page.gutter }}>
        <BrandSymbol size={96} />
        {locked ? (
          <>
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <Text variant="h2" style={{ textAlign: 'center' }}>
                Aquí los esperamos
              </Text>
              <Text tone="muted" style={{ textAlign: 'center' }}>
                Desbloquea para entrar a ahorita.
              </Text>
            </View>
            <Button title="Desbloquear" onPress={onUnlock} loading={busy} />
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 1000, elevation: 1000 },
});

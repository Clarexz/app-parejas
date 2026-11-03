import { View } from 'react-native';

import { Button, Card, Text } from '@/components';
import { formatSize } from '@/lib/appUpdate';
import { useTheme } from '@/theme';

import { openUpdateDownload, useUpdatePrompt } from './hooks';

/** Tarjeta de Inicio cuando hay una versión nueva del APK. */
export function UpdateNotice() {
  const { spacing } = useTheme();
  const { update, later } = useUpdatePrompt();
  if (!update) return null;

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xxs }}>
          <Text variant="h3">Hay versión nueva</Text>
          <Text variant="body" tone="muted">
            La v{update.version} ya está lista ({formatSize(update.sizeBytes)}). Se descarga en el
            navegador; ábrela al terminar y dale a Actualizar. No se borra nada.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title="Descargar" size="sm" onPress={() => void openUpdateDownload(update)} />
          <Button title="Luego" size="sm" variant="ghost" onPress={later} />
        </View>
      </View>
    </Card>
  );
}

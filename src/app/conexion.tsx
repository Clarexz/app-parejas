import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import {
  Button,
  Card,
  Icon,
  LoadingSymbol,
  Screen,
  Text,
  Wordmark,
  type IconName,
} from '@/components';
import type { ServerStatus } from '@/lib/health';
import { supabaseUrl } from '@/lib/supabase';
import { useServerHealth } from '@/lib/useServerHealth';
import { useTheme } from '@/theme';

function serverHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function appVersion(): string {
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '?';
  const build = Application.nativeBuildVersion;
  return build ? `v${version} (${build})` : `v${version}`;
}

const MESSAGES: Record<ServerStatus, string> = {
  connected: 'Conectados con el servidor',
  degraded: 'El servidor responde a medias. Puede tardar un poco.',
  offline: 'No hay señal con el servidor. Revisa tu internet y vuelve a intentar.',
  not_configured: 'Falta configurar el servidor en esta versión de la app.',
};

const ICONS: Record<ServerStatus, IconName> = {
  connected: 'check',
  degraded: 'clock',
  offline: 'cloudOff',
  not_configured: 'settings',
};

export default function ConnectionScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { data, isFetching, refetch } = useServerHealth();

  const status = data?.status;
  const host = serverHost(supabaseUrl);
  const iconColor = !status
    ? colors.ink
    : status === 'connected'
      ? colors.success
      : status === 'not_configured'
        ? colors.ink
        : colors.danger;

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.xs, alignItems: 'flex-start' }}>
          {/* Mantener presionado el nombre abre el catálogo de diseño (solo desarrollo). */}
          <Pressable
            onLongPress={() => router.push('/catalogo')}
            delayLongPress={600}
            accessibilityRole="header"
          >
            <Wordmark layout="horizontal" size={36} />
          </Pressable>
          <Text variant="note" tone="muted">
            {appVersion()}
          </Text>
        </View>

        <Card>
          <View style={{ gap: spacing.md }}>
            <Text variant="label" tone="muted">
              Servidor
            </Text>
            {!status ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <LoadingSymbol size={32} accessibilityLabel="Verificando el servidor" />
                <Text variant="bodyStrong">Revisando el servidor…</Text>
              </View>
            ) : (
              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Icon name={ICONS[status]} color={iconColor} />
                  <Text variant="bodyStrong" style={{ flex: 1 }}>
                    {status === 'offline' ? 'Sin conexión' : MESSAGES[status]}
                  </Text>
                </View>
                {status === 'offline' ? <Text variant="body">{MESSAGES.offline}</Text> : null}
              </View>
            )}
            {host ? (
              <Text variant="note" tone="muted">
                {host}
              </Text>
            ) : null}
            {data?.latencyMs != null ? (
              <Text variant="num" style={{ fontSize: 22, lineHeight: 28 }}>
                {data.latencyMs} ms
              </Text>
            ) : null}
          </View>
        </Card>

        <Button
          title="Reintentar"
          variant="secondary"
          onPress={() => void refetch()}
          loading={isFetching}
          fullWidth
        />
      </View>
    </Screen>
  );
}

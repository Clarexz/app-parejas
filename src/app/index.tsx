import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components';
import { supabaseUrl } from '@/lib/supabase';
import { useServerHealth } from '@/lib/useServerHealth';
import { APP_NAME } from '@/constants/app';
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
  return build ? `${version} (${build})` : version;
}

export default function ConnectionScreen() {
  const { colors, spacing } = useTheme();
  const { data, isFetching, refetch } = useServerHealth();

  const status = data?.status;
  const label =
    status === 'connected'
      ? 'conectado ✅'
      : status === 'degraded'
        ? 'con problemas ⚠️'
        : status === 'offline'
          ? 'sin conexión ❌'
          : status === 'not_configured'
            ? 'sin configurar'
            : 'verificando…';
  const color =
    status === 'connected'
      ? colors.success
      : status === 'degraded' || status === 'offline'
        ? colors.danger
        : colors.textMuted;
  const host = serverHost(supabaseUrl);

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="title">{APP_NAME}</Text>
          <Text variant="caption">Versión {appVersion()}</Text>
        </View>
        <Card>
          <Text style={{ color, fontWeight: '600' }}>Servidor: {label}</Text>
          {host ? <Text variant="caption">{host}</Text> : null}
          {data?.latencyMs != null ? (
            <Text variant="caption">Latencia: {data.latencyMs} ms</Text>
          ) : null}
        </Card>
        <Button title="Reintentar" onPress={() => void refetch()} loading={isFetching} />
      </View>
    </Screen>
  );
}

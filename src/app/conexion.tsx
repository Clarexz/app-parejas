import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import {
  Button,
  Card,
  CloudOff,
  Icon,
  Polaroid,
  Scene,
  Screen,
  Stamp,
  Sticker,
  Text,
  type IconName,
} from '@/components';
import { APP_NAME } from '@/constants/app';
import type { ServerStatus } from '@/lib/health';
import { tiltFor } from '@/lib/tilt';
import { formatStampDate } from '@/lib/stampDate';
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

/** Estado de carga: renglones tenues, como si estuvieran por escribirse (DISENO §8). */
function CheckingNote() {
  const { colors, spacing } = useTheme();
  return (
    <View accessibilityLabel="Verificando el servidor" style={{ gap: spacing.md }}>
      <Text variant="hand">Revisando el servidor…</Text>
      <View style={{ gap: spacing.sm }}>
        <View style={{ height: 2, width: '80%', backgroundColor: colors.ruled }} />
        <View style={{ height: 2, width: '55%', backgroundColor: colors.ruled }} />
      </View>
    </View>
  );
}

export default function ConnectionScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { data, isFetching, refetch } = useServerHealth();

  const status = data?.status;
  const host = serverHost(supabaseUrl);

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.xs, alignItems: 'flex-start' }}>
          <Stamp>{formatStampDate(new Date())}</Stamp>
          <Pressable
            onLongPress={() => router.push('/catalogo')}
            delayLongPress={600}
            accessibilityRole="header"
          >
            <Text variant="display">{APP_NAME}</Text>
          </Pressable>
          <Text variant="mono" muted>
            {appVersion()}
          </Text>
        </View>

        <View style={{ gap: spacing.lg }}>
          <Text variant="hand" muted>
            Aquí empieza su libreta.
          </Text>
          <View style={{ paddingLeft: spacing.sm }}>
            <Polaroid size="M" tilt={tiltFor('pagina-1')} tape="yellow" caption="Página 1">
              <Scene kind="hill" />
            </Polaroid>
          </View>
        </View>

        {status === 'offline' ? (
          <View style={{ alignItems: 'flex-start', gap: spacing.sm }}>
            <CloudOff width={128} height={96} />
            <Text variant="body">{MESSAGES.offline}</Text>
          </View>
        ) : null}

        <Card>
          {!status ? (
            <CheckingNote />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              {status === 'connected' ? (
                <Sticker icon="check" tone="nopal" />
              ) : (
                <Icon
                  name={ICONS[status]}
                  color={
                    status === 'degraded' || status === 'offline' ? colors.chile : colors.inkMuted
                  }
                />
              )}
              <View style={{ flex: 1 }}>
                <Text
                  variant="bodyStrong"
                  tone={
                    status === 'connected' ? 'nopal' : status === 'not_configured' ? 'ink' : 'chile'
                  }
                >
                  {status === 'offline' ? 'Sin conexión' : MESSAGES[status]}
                </Text>
              </View>
            </View>
          )}
          {host ? (
            <Text variant="mono" muted>
              {host}
            </Text>
          ) : null}
          {data?.latencyMs != null ? (
            <Text variant="mono" muted>
              {data.latencyMs} ms
            </Text>
          ) : null}
        </Card>

        <View style={{ alignItems: 'flex-start' }}>
          <Button
            title="Reintentar"
            variant="secondary"
            onPress={() => void refetch()}
            loading={isFetching}
          />
        </View>
      </View>
    </Screen>
  );
}

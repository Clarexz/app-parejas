import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  CloudOff,
  Divider,
  EmptyState,
  IconButton,
  LoadingLines,
  PermissionNote,
  Screen,
  Text,
  TimeField,
  Toggle,
  useToast,
} from '@/components';
import { useCouple } from '@/features/couple';
import {
  useNotificationPrefs,
  usePushPermission,
  useSendTestNotification,
  useUpdateNotificationPrefs,
  type NotificationPrefs,
} from '@/features/notifications';
import { errorMessage } from '@/lib/errors';
import { useTheme } from '@/theme';

type KindKey = 'answers' | 'comments' | 'moods' | 'nudges';

function kindRows(name: string | null): { key: KindKey; label: string; hint: string }[] {
  const who = name ?? 'tu pareja';
  return [
    {
      key: 'answers',
      label: name ? `Cuando ${name} contesta` : 'Cuando tu pareja contesta',
      hint: 'La pregunta del día, para que desdobles su respuesta.',
    },
    {
      key: 'comments',
      label: 'Cuando comentan tus respuestas',
      hint: `Lo que ${who} te escribe debajo.`,
    },
    {
      key: 'moods',
      label: name ? `Cuando cambia el mood de ${name}` : 'Cuando cambia su mood',
      hint: 'Para saber cómo anda sin preguntar.',
    },
    {
      key: 'nudges',
      label: 'Cuando te recuerdan la pregunta',
      hint: `Un toque de ${who} para que contestes.`,
    },
  ];
}

export default function NotificationSettingsScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { partner } = useCouple();
  const { prefs, isLoading, error, refetch } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();
  const permission = usePushPermission();
  const test = useSendTestNotification();
  const [asking, setAsking] = useState(false);

  const partnerName = partner?.nickname || partner?.display_name || null;

  const change = (partial: Partial<NotificationPrefs>) =>
    update.mutate(partial, {
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
    });

  const request = async () => {
    setAsking(true);
    try {
      await permission.request();
    } finally {
      setAsking(false);
    }
  };

  const sendTest = () =>
    test.mutate(undefined, {
      onSuccess: (sent) =>
        toast.show(
          sent
            ? { message: 'Va en camino. Debe llegar en unos segundos.', tone: 'success' }
            : {
                message:
                  'Todavía no se puede: el servidor aún no tiene los avisos configurados o este celular no tiene permiso.',
                tone: 'info',
              },
        ),
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
    });

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg }}>
        <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
          <IconButton name="back" accessibilityLabel="Volver" onPress={() => router.back()} />
        </View>
        <Text variant="display" accessibilityRole="header">
          Avisos
        </Text>

        <PermissionNote
          status={permission.status}
          canAskAgain={permission.canAskAgain}
          onRequest={() => void request()}
          onOpenSettings={permission.openSettings}
          loading={asking}
        />

        {isLoading ? (
          <LoadingLines count={5} />
        ) : error ? (
          <EmptyState
            illustration={<CloudOff />}
            title="Sin señal"
            body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
            actionLabel="Reintentar"
            onAction={() => void refetch()}
          />
        ) : (
          <>
            <Divider />
            <Text variant="title" accessibilityRole="header">
              Qué te avisamos
            </Text>
            <View>
              {kindRows(partnerName).map((row, i, all) => (
                <View key={row.key}>
                  <View
                    style={{
                      minHeight: 64,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      paddingVertical: spacing.sm,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="body">{row.label}</Text>
                      <Text variant="caption" tone="muted">
                        {row.hint}
                      </Text>
                    </View>
                    <Toggle
                      value={prefs[row.key]}
                      onValueChange={(v) => change({ [row.key]: v })}
                      accessibilityLabel={row.label}
                    />
                  </View>
                  {i < all.length - 1 ? <Divider /> : null}
                </View>
              ))}
            </View>

            <Divider />
            <Text variant="title" accessibilityRole="header">
              Recordatorio diario
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: 48,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body">Recordarme la pregunta de hoy</Text>
                <Text variant="caption" tone="muted">
                  Solo suena si aún no la contestas.
                </Text>
              </View>
              <Toggle
                value={prefs.reminderEnabled}
                onValueChange={(v) => change({ reminderEnabled: v })}
                accessibilityLabel="Recordarme la pregunta de hoy"
              />
            </View>
            <TimeField
              label="A qué hora"
              value={prefs.reminderTime}
              onChange={(t) => change({ reminderTime: t })}
              disabled={!prefs.reminderEnabled}
            />

            <Divider />
            <View style={{ alignItems: 'flex-start', gap: spacing.sm }}>
              <Button
                title="Mandarme una de prueba"
                variant="secondary"
                onPress={sendTest}
                loading={test.isPending}
                disabled={permission.status !== 'granted'}
              />
              {permission.status !== 'granted' ? (
                <Text variant="caption" tone="muted">
                  Primero activa los avisos en este celular.
                </Text>
              ) : null}
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

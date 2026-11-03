import { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Divider,
  EmptyState,
  LoadingSymbol,
  PermissionNote,
  Screen,
  ScreenHeader,
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

type KindKey = 'answers' | 'comments' | 'moods' | 'nudges' | 'stories' | 'memories' | 'games';

function kindRows(name: string | null): { key: KindKey; label: string; hint: string }[] {
  const who = name ?? 'tu pareja';
  return [
    {
      key: 'answers',
      label: name ? `Cuando ${name} contesta` : 'Cuando tu pareja contesta',
      hint: 'La pregunta del día, para que veas su respuesta.',
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
    {
      key: 'stories',
      label: 'Stories nuevas y respuestas',
      hint: `Cuando ${who} sube una story o responde a la tuya.`,
    },
    {
      key: 'memories',
      label: 'Memorias y visitas',
      hint: `Cuando ${who} guarda una memoria o apunta una visita.`,
    },
    {
      key: 'games',
      label: 'Juegos y tests',
      hint: `Cuando ${who} te reta, termina una ronda, deja un dibujo o hace el test de lenguajes del amor.`,
    },
  ];
}

export default function NotificationSettingsScreen() {
  const { spacing } = useTheme();
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
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }),
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
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'danger' }),
    });

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader title="Avisos" back="Más" />

        <PermissionNote
          status={permission.status}
          canAskAgain={permission.canAskAgain}
          onRequest={() => void request()}
          onOpenSettings={permission.openSettings}
          loading={asking}
        />

        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <LoadingSymbol />
          </View>
        ) : error ? (
          <EmptyState
            art="bubble"
            title="Sin señal"
            body="No pudimos conectarnos. Revisa tu internet y vuelve a intentar."
            action={{ label: 'Reintentar', onPress: () => void refetch() }}
          />
        ) : (
          <>
            <Text variant="label" tone="muted" accessibilityRole="header">
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
                      <Text variant="note" tone="muted">
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

            <Text variant="label" tone="muted" accessibilityRole="header">
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
                <Text variant="note" tone="muted">
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

            <View style={{ gap: spacing.sm }}>
              <Button
                title="Mandarme una de prueba"
                variant="secondary"
                onPress={sendTest}
                loading={test.isPending}
                disabled={permission.status !== 'granted'}
                fullWidth
              />
              {permission.status !== 'granted' ? (
                <Text variant="note" tone="muted">
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

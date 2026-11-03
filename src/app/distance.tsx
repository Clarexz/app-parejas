import { useState } from 'react';
import { Linking, View } from 'react-native';

import {
  Button,
  Card,
  Icon,
  ListGroup,
  ListRow,
  LoadingSymbol,
  Notice,
  Screen,
  ScreenHeader,
  Segmented,
  Sheet,
  Text,
  Toggle,
  useToast,
} from '@/components';
import { initialOf } from '@/components/Avatar';
import { useCouple } from '@/features/couple';
import { useDistance, useShareLocation } from '@/features/distance';
import { DistanceRoute } from '@/features/distance/components/DistanceRoute';
import { spokenKm, type ShareMode } from '@/lib/distance';
import { errorMessage } from '@/lib/errors';
import { useTheme } from '@/theme';

const MODES = [
  { value: 'foreground', label: 'Al abrir la app' },
  { value: 'background', label: 'En segundo plano' },
] as const;

const MODE_COPY: Record<Exclude<ShareMode, 'off'>, string> = {
  foreground: 'Tu ubicación se actualiza cuando abres la app. No usa batería con la app cerrada.',
  background:
    'Se actualiza sola de vez en cuando, aunque la app esté cerrada. Android la limita a unas pocas veces por hora, así que casi no gasta batería. Necesita el permiso “Permitir todo el tiempo”.',
};

const PRIVACY = [
  'Solo se guarda tu última ubicación, redondeada a más o menos 1 km y con el nombre de tu ciudad. No hay historial ni rutas.',
  'Solo la ve tu pareja. Se borra cuando apagas la distancia o cuando salen de la pareja.',
  'La app pide ubicación aproximada, nunca la exacta, y no te la pide hasta que tú la activas aquí.',
  'En segundo plano Android entrega pocas actualizaciones por hora, por eso el gasto de batería es mínimo. Si lo notas, vuelve a “Al abrir la app”.',
];

/** Quién es quién bajo los círculos: nombre, ciudad y, de tu pareja, cuándo se actualizó. */
function Place({
  who,
  city,
  extra,
  end = false,
}: {
  who: string;
  city: string | null;
  extra?: string;
  end?: boolean;
}) {
  return (
    <View style={{ flex: 1, alignItems: end ? 'flex-end' : 'flex-start' }}>
      <Text variant="ui">{who}</Text>
      <Text variant="note" tone="muted" style={{ textAlign: end ? 'right' : 'left' }}>
        {city ?? 'sin ciudad'}
      </Text>
      {extra ? (
        <Text variant="note" tone="muted">
          {extra}
        </Text>
      ) : null}
    </View>
  );
}

export default function DistanceScreen() {
  const { spacing, colors } = useTheme();
  const toast = useToast();
  const { refetch: refetchCouple } = useCouple();
  const { isLoading, isError, partnerName, refetch, ...view } = useDistance();
  const { supported, mode, permission, setMode, isPending } = useShareLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [askBackground, setAskBackground] = useState(false);
  const [deniedHere, setDeniedHere] = useState(false);

  const sharing = mode !== 'off';
  const fgRevoked = sharing && permission !== null && !permission.foreground.granted;
  const bgRevoked =
    mode === 'background' &&
    permission !== null &&
    permission.foreground.granted &&
    !permission.background.granted;
  const showDenied = supported && (fgRevoked || deniedHere);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchCouple(), refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const apply = async (next: ShareMode) => {
    setAskBackground(false);
    try {
      const result = await setMode(next);
      if (result.ok) {
        setDeniedHere(false);
        if (result.mode === 'off') {
          toast.show({ message: 'Dejaste de compartir. Borramos tu ubicación.', tone: 'info' });
        } else if (!result.position) {
          toast.show({
            message:
              'No pudimos leer tu ubicación. Revisa que la ubicación del celular esté prendida.',
            tone: 'info',
          });
        } else {
          toast.show({ message: 'Listo, ya comparten su distancia.', tone: 'success' });
        }
      } else if (result.reason === 'denied') {
        setDeniedHere(true);
        toast.show({ message: 'Sin el permiso de ubicación no podemos medirla.', tone: 'info' });
      } else if (result.reason === 'background_denied') {
        setDeniedHere(false);
        toast.show({
          message:
            'Quedó en “Al abrir la app”. Para el segundo plano elige “Permitir todo el tiempo”.',
          tone: 'info',
        });
      }
    } catch (error) {
      toast.show({ message: errorMessage(error), tone: 'error' });
    }
  };

  const meInitial = 'T';
  const hero = () => {
    if (isLoading) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl }}>
          <LoadingSymbol accessibilityLabel="Cargando la distancia" />
        </View>
      );
    }
    if (isError) {
      return (
        <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => void refetch() }}>
          No pudimos traer la distancia. Revisa tu internet y vuelve a intentar.
        </Notice>
      );
    }
    if (!supported && view.kind === 'none') {
      return (
        <Notice>
          La distancia solo funciona en el celular. Ábrela desde la app para activarla.
        </Notice>
      );
    }
    const route = (
      <DistanceRoute
        meActive={view.kind === 'both' || view.kind === 'only_me'}
        partnerActive={view.kind === 'both' || view.kind === 'only_partner'}
        km={view.km}
        meInitial={meInitial}
        partnerInitial={initialOf(partnerName)}
      />
    );
    if (view.kind === 'both') {
      return (
        <Card>
          <View style={{ gap: spacing.lg }}>
            <View
              style={{ gap: spacing.xs }}
              accessible
              accessibilityLabel={`Están a ${spokenKm(view.km)}`}
            >
              <Text variant="label" tone="muted">
                Están a
              </Text>
              <Text variant="display">{view.kmText}</Text>
              {view.phrase ? (
                <Text variant="body" tone="muted">
                  {view.phrase}
                </Text>
              ) : null}
            </View>
            {route}
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg }}
            >
              <Place who="Tú" city={view.myCity} />
              <Place who={partnerName} city={view.partnerCity} extra={view.partnerAgo} end />
            </View>
          </View>
        </Card>
      );
    }
    const title = view.kind === 'only_me' ? `Falta ${partnerName}` : '¿A cuántos kilómetros están?';
    const text =
      view.kind === 'only_me'
        ? `Cuando ${partnerName} active su distancia, aquí verán cuántos kilómetros hay entre ustedes.`
        : view.kind === 'only_partner'
          ? `${partnerName} ya comparte su distancia. Activa la tuya para ver cuántos kilómetros hay entre ustedes.`
          : 'Cada quien decide si comparte su ubicación aproximada. Cuando los dos la activen, aquí aparece la distancia.';
    return (
      <Card>
        <View style={{ gap: spacing.lg }}>
          {route}
          <View style={{ gap: spacing.xs }}>
            <Text variant="h3" accessibilityRole="header">
              {title}
            </Text>
            <Text variant="body" tone="muted">
              {text}
            </Text>
          </View>
          {view.kind === 'only_me' ? <Place who="Tú" city={view.myCity} /> : null}
          {!sharing && supported ? (
            <Button
              title="Activar mi distancia"
              loading={isPending}
              onPress={() => void apply('foreground')}
            />
          ) : null}
        </View>
      </Card>
    );
  };

  return (
    <Screen scroll refreshing={refreshing} onRefresh={() => void refresh()}>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader title="Distancia" back="Atrás" />

        {hero()}

        <View style={{ gap: spacing.md }}>
          <ListGroup label="Compartir">
            <ListRow
              label="Compartir mi distancia"
              icon="distance"
              divider={false}
              right={
                <Toggle
                  value={sharing}
                  disabled={!supported || isPending}
                  accessibilityLabel="Compartir mi distancia"
                  onValueChange={(on) => void apply(on ? 'foreground' : 'off')}
                />
              }
            />
          </ListGroup>
          <Text variant="note" tone="muted">
            {supported
              ? 'Tú decides: puedes apagarla cuando quieras.'
              : 'Se activa desde el celular.'}
          </Text>

          {sharing ? (
            <View style={{ gap: spacing.sm }}>
              <Segmented
                options={MODES}
                value={mode === 'background' ? 'background' : 'foreground'}
                onChange={(key) => {
                  if (isPending || mode === key) return;
                  if (key === 'background') setAskBackground(true);
                  else void apply(key);
                }}
                accessibilityLabel="Cuándo se actualiza tu ubicación"
              />
              <Text variant="note" tone="muted">
                {MODE_COPY[mode === 'background' ? 'background' : 'foreground']}
              </Text>
            </View>
          ) : null}

          {showDenied ? (
            <Notice
              tone="danger"
              action={{
                label: 'Abrir ajustes del celular',
                onPress: () => void Linking.openSettings(),
              }}
            >
              La ubicación está apagada para esta app. Se activa en Ajustes, Permisos, Ubicación,
              “Permitir solo mientras se usa la app”.
            </Notice>
          ) : null}

          {bgRevoked ? (
            <Notice
              action={{
                label: 'Abrir ajustes del celular',
                onPress: () => void Linking.openSettings(),
              }}
            >
              Para el segundo plano falta el permiso “Permitir todo el tiempo”. Mientras, la
              distancia se actualiza al abrir la app.
            </Notice>
          ) : null}
        </View>

        <View style={{ gap: spacing.md }} accessible={false}>
          <Text variant="label" tone="muted" accessibilityRole="header">
            Qué se guarda y qué gasta
          </Text>
          {PRIVACY.map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: spacing.md }}>
              <Icon name="lock" size={20} color={colors.inkMuted} />
              <Text variant="note" tone="muted" style={{ flex: 1 }}>
                {line}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Sheet
        visible={askBackground}
        onClose={() => setAskBackground(false)}
        title="Permitir todo el tiempo"
      >
        <View style={{ gap: spacing.lg }}>
          <Text variant="body" tone="muted">
            Para actualizarse con la app cerrada, Android te va a mandar a Ajustes. Ahí elige
            “Permitir todo el tiempo”. Lo usamos solo para esto, de vez en cuando y con ubicación
            aproximada.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Button title="Continuar" onPress={() => void apply('background')} />
            <Button title="Mejor no" variant="ghost" onPress={() => setAskBackground(false)} />
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

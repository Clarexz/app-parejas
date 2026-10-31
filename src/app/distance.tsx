import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import {
  Button,
  Chip,
  CloudOff,
  Divider,
  Doodle,
  EmptyState,
  Icon,
  IconButton,
  LoadingLines,
  Note,
  PageHeader,
  Screen,
  Sheet,
  Text,
  Toggle,
  useToast,
} from '@/components';
import { useCouple, useToday } from '@/features/couple';
import { useDistance, useShareLocation } from '@/features/distance';
import { spokenKm, type ShareMode } from '@/lib/distance';
import { errorMessage } from '@/lib/errors';
import { formatStampIsoDate } from '@/lib/stampDate';
import { useTheme } from '@/theme';

const MODE_COPY: Record<Exclude<ShareMode, 'off'>, { label: string; text: string }> = {
  foreground: {
    label: 'Al abrir la app',
    text: 'Tu ubicación se actualiza cuando abres la app. No usa batería con la app cerrada.',
  },
  background: {
    label: 'También en segundo plano',
    text: 'Se actualiza sola de vez en cuando, aunque la app esté cerrada. Android la limita a unas pocas veces por hora, así que casi no gasta batería. Necesita el permiso “Permitir todo el tiempo”.',
  },
};

function PlaceRow({ who, city, extra }: { who: string; city: string | null; extra?: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Icon name="pin" size={20} />
      <Text variant="body" style={{ flex: 1 }}>
        <Text variant="bodyStrong">{`${who}: `}</Text>
        {city ?? 'sin ciudad'}
        {extra ? ` · ${extra}` : ''}
      </Text>
    </View>
  );
}

export default function DistanceScreen() {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { refetch: refetchCouple } = useCouple();
  const { today } = useToday();
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

  const hero = () => {
    if (isLoading) return <LoadingLines count={3} accessibilityLabel="Cargando la distancia" />;
    if (isError) {
      return (
        <EmptyState
          illustration={<CloudOff />}
          title="No pudimos traer la distancia"
          body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
          actionLabel="Reintentar"
          onAction={() => void refetch()}
        />
      );
    }
    if (!supported && view.kind === 'none') {
      return (
        <Text variant="body" tone="muted">
          La distancia solo funciona en el celular. Ábrela desde la app para activarla.
        </Text>
      );
    }
    if (view.kind === 'both') {
      return (
        <View style={{ gap: spacing.md }}>
          <View
            style={{ alignSelf: 'flex-start' }}
            accessible
            accessibilityLabel={`Están a ${spokenKm(view.km)}`}
          >
            <Text variant="hero">{view.kmText}</Text>
            <Doodle kind="underline" />
          </View>
          <Text variant="hand">{view.phrase}</Text>
          <View style={{ gap: spacing.sm }}>
            <PlaceRow who="Tú" city={view.myCity} />
            <PlaceRow who={partnerName} city={view.partnerCity} extra={view.partnerAgo} />
          </View>
        </View>
      );
    }
    if (view.kind === 'only_me') {
      return (
        <View style={{ gap: spacing.md }}>
          <Text variant="title">Falta {partnerName}</Text>
          <Text variant="body" tone="muted">
            {`Cuando ${partnerName} active su distancia, aquí verán cuántos kilómetros hay entre ustedes.`}
          </Text>
          <PlaceRow who="Tú" city={view.myCity} />
        </View>
      );
    }
    return (
      <View style={{ gap: spacing.md }}>
        <Text variant="title">¿A cuántos kilómetros están?</Text>
        <Text variant="body" tone="muted">
          {view.kind === 'only_partner'
            ? `${partnerName} ya comparte su distancia. Activa la tuya para ver cuántos kilómetros hay entre ustedes.`
            : `Cada quien decide si comparte su ubicación aproximada. Cuando los dos la activen, aquí aparece la distancia.`}
        </Text>
        {!sharing && supported ? (
          <View style={{ alignItems: 'flex-start' }}>
            <Button
              title="Activar mi distancia"
              loading={isPending}
              onPress={() => void apply('foreground')}
            />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Screen scroll refreshing={refreshing} onRefresh={() => void refresh()}>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
            <IconButton name="back" accessibilityLabel="Volver" onPress={() => router.back()} />
          </View>
          <PageHeader stamp={formatStampIsoDate(today)} title="Distancia" />
        </View>

        {hero()}

        <Divider />

        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="heading" accessibilityRole="header">
                Compartir mi distancia
              </Text>
              <Text variant="small" tone="muted">
                {supported
                  ? 'Tú decides: puedes apagarla cuando quieras.'
                  : 'Se activa desde el celular.'}
              </Text>
            </View>
            <Toggle
              value={sharing}
              disabled={!supported || isPending}
              accessibilityLabel="Compartir mi distancia"
              onValueChange={(on) => void apply(on ? 'foreground' : 'off')}
            />
          </View>

          {sharing ? (
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {(['foreground', 'background'] as const).map((key) => (
                  <Chip
                    key={key}
                    label={MODE_COPY[key].label}
                    color={key === 'foreground' ? 'yellow' : 'mint'}
                    selected={mode === key}
                    disabled={isPending}
                    onPress={() => {
                      if (mode === key) return;
                      if (key === 'background') setAskBackground(true);
                      else void apply(key);
                    }}
                  />
                ))}
              </View>
              <Text variant="small" tone="muted">
                {MODE_COPY[mode === 'background' ? 'background' : 'foreground'].text}
              </Text>
            </View>
          ) : null}

          {showDenied ? (
            <View style={{ gap: spacing.md, alignItems: 'flex-start' }}>
              <Note id="permiso-ubicacion" tape={false} style={{ alignSelf: 'stretch' }}>
                <Text variant="hand" style={{ color: colors.onPostit }}>
                  La ubicación está apagada para esta app. Se activa en Ajustes → Permisos →
                  Ubicación → Permitir solo mientras se usa la app.
                </Text>
              </Note>
              <Button
                title="Abrir ajustes del celular"
                variant="secondary"
                onPress={() => void Linking.openSettings()}
              />
            </View>
          ) : null}

          {bgRevoked ? (
            <View style={{ gap: spacing.md, alignItems: 'flex-start' }}>
              <Text variant="small" tone="muted">
                Para el segundo plano falta el permiso “Permitir todo el tiempo”. Mientras tanto la
                distancia se actualiza al abrir la app.
              </Text>
              <Button
                title="Abrir ajustes del celular"
                variant="secondary"
                onPress={() => void Linking.openSettings()}
              />
            </View>
          ) : null}
        </View>

        <Divider />

        <View style={{ gap: spacing.sm }} accessible={false}>
          <Text variant="heading" accessibilityRole="header">
            Qué se guarda y qué gasta
          </Text>
          <Text variant="small" tone="muted">
            • Solo se guarda tu última ubicación, redondeada a más o menos 1 km y con el nombre de
            tu ciudad. No hay historial ni rutas.
          </Text>
          <Text variant="small" tone="muted">
            • Solo la ve tu pareja. Se borra cuando apagas la distancia o cuando salen de la pareja.
          </Text>
          <Text variant="small" tone="muted">
            • La app pide ubicación aproximada, nunca la exacta, y no te la pide hasta que tú la
            activas aquí.
          </Text>
          <Text variant="small" tone="muted">
            • En segundo plano Android entrega pocas actualizaciones por hora, por eso el gasto de
            batería es mínimo. Si lo notas, vuelve a “Al abrir la app”.
          </Text>
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

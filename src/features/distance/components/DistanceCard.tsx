import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, Doodle, LoadingLines, Stamp, Text } from '@/components';
import { spokenKm, type DistanceView } from '@/lib/distance';
import { tiltFor } from '@/lib/tilt';
import { useTheme } from '@/theme';

import { useDistance } from '../hooks';

type ViewProps = {
  view: DistanceView;
  partnerName: string;
  onPress: () => void;
};

/** La ficha con sus estados (sin datos remotos: se prueba directo). */
export function DistanceCardView({ view, partnerName, onPress }: ViewProps) {
  const { spacing } = useTheme();
  const tilt = tiltFor('distancia', 1) || -1;

  if (view.kind === 'both' && view.kmText) {
    const places = view.route || 'Toca para ver dónde están';
    return (
      <Card
        tilt={tilt}
        onPress={onPress}
        accessibilityLabel={`Distancia: ${spokenKm(view.km)}. ${view.route ? `${view.route}. ` : ''}Toca para ver el detalle.`}
      >
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Stamp tone="ink">DISTANCIA</Stamp>
            {view.partnerAgo ? (
              <Text variant="caption" tone="muted">
                {`${partnerName}: ${view.partnerAgo}`}
              </Text>
            ) : null}
          </View>
          <View style={{ alignSelf: 'flex-start' }}>
            <Text variant="display">{view.kmText}</Text>
            <Doodle kind="underline" />
          </View>
          <Text variant="small" tone="muted" numberOfLines={2}>
            {places}
          </Text>
          {view.phrase ? <Text variant="handSmall">{view.phrase}</Text> : null}
        </View>
      </Card>
    );
  }

  const text =
    view.kind === 'only_me'
      ? `Ya compartes tu distancia. Cuando ${partnerName} active la suya, aquí verán cuántos kilómetros hay entre ustedes.`
      : view.kind === 'only_partner'
        ? `${partnerName} ya comparte su distancia. Activa la tuya para ver cuántos kilómetros hay entre ustedes.`
        : 'Vean cuántos kilómetros hay entre ustedes. Cada quien decide si la comparte.';
  const action = view.kind === 'only_me' ? 'Ver detalle' : 'Activar mi distancia';
  return (
    <Card
      tilt={tilt}
      onPress={onPress}
      accessibilityLabel={`Distancia. ${text} Toca para ${action.toLowerCase()}.`}
    >
      <View style={{ gap: spacing.sm }}>
        <Text variant="hand">Distancia</Text>
        <Text variant="body" tone="muted">
          {text}
        </Text>
        <Text variant="bodyStrong" tone="jamaica">
          {action}
        </Text>
      </View>
    </Card>
  );
}

/** Distancia en Inicio: toca → pantalla Distancia (DISENO §7). */
export function DistanceCard() {
  const router = useRouter();
  const { isLoading, isError, partnerName, refetch, ...view } = useDistance();

  if (isLoading) {
    return (
      <Card tilt={tiltFor('distancia', 1) || -1}>
        <Text variant="hand">Distancia</Text>
        <LoadingLines count={2} accessibilityLabel="Cargando la distancia" />
      </Card>
    );
  }

  // Si falla la lectura no se estorba en Inicio: la tarjeta invita a abrir la pantalla.
  return (
    <DistanceCardView
      view={isError ? { ...view, kind: 'none' } : view}
      partnerName={partnerName}
      onPress={() => router.push('/distance')}
    />
  );
}

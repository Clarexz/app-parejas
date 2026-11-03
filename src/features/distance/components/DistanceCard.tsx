import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, LoadingSymbol, Text } from '@/components';
import { initialOf } from '@/components/Avatar';
import { spokenKm, type DistanceView } from '@/lib/distance';
import { useTheme } from '@/theme';

import { useDistance } from '../hooks';
import { DistanceRoute } from './DistanceRoute';

type ViewProps = {
  view: DistanceView;
  partnerName: string;
  onPress: () => void;
};

/** La tarjeta con sus estados (sin datos remotos: se prueba directo). */
export function DistanceCardView({ view, partnerName, onPress }: ViewProps) {
  const { spacing } = useTheme();
  const route = (
    <DistanceRoute
      compact
      meActive={view.kind === 'both' || view.kind === 'only_me'}
      partnerActive={view.kind === 'both' || view.kind === 'only_partner'}
      km={view.km}
      meInitial="T"
      partnerInitial={initialOf(partnerName)}
    />
  );

  if (view.kind === 'both' && view.kmText) {
    return (
      <Card
        onPress={onPress}
        accessibilityLabel={`Distancia: ${spokenKm(view.km)}. ${view.route ? `${view.route}. ` : ''}Toca para ver el detalle.`}
      >
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="muted">
            Distancia
          </Text>
          <Text variant="display">{view.kmText}</Text>
          {route}
          <Text variant="note" tone="muted" numberOfLines={2}>
            {view.route || 'Toca para ver dónde están'}
          </Text>
          {view.partnerAgo ? (
            <Text variant="note" tone="muted">
              {`${partnerName} actualizó ${view.partnerAgo}`}
            </Text>
          ) : null}
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
      onPress={onPress}
      accessibilityLabel={`Distancia. ${text} Toca para ${action.toLowerCase()}.`}
    >
      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="muted">
          Distancia
        </Text>
        {route}
        <Text variant="body" tone="muted">
          {text}
        </Text>
        <Text variant="ui">{action}</Text>
      </View>
    </Card>
  );
}

/** Distancia en Inicio: toca → pantalla Distancia (DISENO §8). */
export function DistanceCard() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { isLoading, isError, partnerName, refetch, ...view } = useDistance();

  if (isLoading) {
    return (
      <Card>
        <Text variant="label" tone="muted">
          Distancia
        </Text>
        <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
          <LoadingSymbol size={32} accessibilityLabel="Cargando la distancia" />
        </View>
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

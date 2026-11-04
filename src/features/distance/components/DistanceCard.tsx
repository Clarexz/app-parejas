import { View } from 'react-native';

import { Card, initialOf, LoadingSymbol, Text } from '@/components';
import { HomePrompt } from '@/features/home/components/HomePrompt';
import { spokenKm, type DistanceView } from '@/lib/distance';
import { useTheme } from '@/theme';

import { DistanceRoute } from './DistanceRoute';

type ViewProps = {
  view: DistanceView;
  partnerName: string;
  loading?: boolean;
  onPress: () => void;
};

/**
 * Distancia en Inicio (toca → pantalla Distancia). Con los dos compartiendo es la tarjeta con los
 * kilómetros; si falta alguien, una invitación de una línea. Sin datos remotos: se prueba directo.
 */
export function DistanceCardView({ view, partnerName, loading = false, onPress }: ViewProps) {
  const { spacing } = useTheme();
  if (loading) {
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
      ? `Falta que ${partnerName} active su distancia`
      : view.kind === 'only_partner'
        ? `${partnerName} ya comparte su distancia. Activa la tuya`
        : 'Vean cuántos kilómetros hay entre ustedes';
  return <HomePrompt icon="distance" text={text} onPress={onPress} />;
}

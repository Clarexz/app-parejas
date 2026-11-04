import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Card, Icon, Text } from '@/components';
import { useCouple } from '@/features/couple';
import { useCountdowns } from '@/features/events';
import { formatNumber } from '@/lib/dates';
import { visitStats, visitsHighlight } from '@/lib/visits';
import { useTheme } from '@/theme';

import { useVisits, useVisitsRealtime } from '../hooks';

const plural = (n: number, one: string, many: string) =>
  `${formatNumber(n)} ${n === 1 ? one : many}`;

/**
 * Bloque compacto de visitas para arriba de Memorias: el dato protagonista (juntos o días sin
 * verse), cuántas veces se han visto y la próxima. Toda la tarjeta lleva a `/visits`.
 * Mientras carga o si falla no ocupa lugar: las memorias son lo importante de la pestaña.
 */
export function VisitsSummary() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { couple } = useCouple();
  useVisitsRealtime(couple?.id ?? null);
  const { visits, isLoading, isError } = useVisits();
  const { visit: nextVisit, today } = useCountdowns();
  const anniversary = couple?.anniversary_date ?? null;
  const stats = useMemo(
    () => visitStats(visits, { start: anniversary, today }),
    [visits, anniversary, today],
  );
  if (isLoading || isError) return null;

  const open = () => router.push('/visits');
  const highlight = visitsHighlight(stats, today);
  const waiting = nextVisit ? nextVisit.daysUntil : null;
  const summary = highlight
    ? `${plural(stats.count, 'visita', 'visitas')} · ${plural(stats.daysTogether, 'día', 'días')} juntos en persona`
    : null;

  return (
    <Card
      onPress={open}
      accessibilityLabel={
        highlight
          ? `Visitas. ${highlight.value} ${highlight.label}. ${summary}. Toca para ver las visitas`
          : 'Visitas. Aún no apuntan ninguna. Toca para ver las visitas'
      }
    >
      <Text variant="label" tone="muted">
        Visitas
      </Text>
      {highlight ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
          <Text variant="num">{highlight.value}</Text>
          <Text variant="ui" style={{ flex: 1 }}>
            {highlight.label}
          </Text>
        </View>
      ) : (
        <Text variant="h3">Aún no apuntan ninguna visita</Text>
      )}
      {summary ? (
        <Text variant="note" tone="muted">
          {summary}
          {waiting !== null
            ? waiting === 0
              ? ' · se ven hoy'
              : ` · faltan ${plural(waiting, 'día', 'días')} para la próxima`
            : ''}
        </Text>
      ) : (
        <Text variant="note" tone="muted">
          Apúntenlas y vayan llenando el calendario de días juntos.
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          marginTop: spacing.xs,
        }}
      >
        <Text variant="ui">Ver visitas</Text>
        <Icon name="chevron" size={18} />
      </View>
    </Card>
  );
}

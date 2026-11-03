import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';

import { Chip, EmptyState, Input, LoadingSymbol, Screen, ScreenHeader, Text } from '@/components';
import { useCouple, useToday } from '@/features/couple';
import { useCategories, useHistory } from '@/features/questions';
import { HistoryCard } from '@/features/questions/components/HistoryCard';
import { groupHistoryByMonth, type HistoryRow } from '@/features/questions/groupByMonth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useTheme } from '@/theme';

export default function HistoryScreen() {
  const { spacing, fruit } = useTheme();
  const router = useRouter();
  const { partner } = useCouple();
  const { today, timeZone } = useToday();
  const { categories } = useCategories();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const search = useDebouncedValue(text.trim(), 300);
  const history = useHistory({ search, category });
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';
  const filtering = search.length > 0 || category !== null;
  const year = Number(today.slice(0, 4)) || new Date().getFullYear();
  const rows = useMemo(() => groupHistoryByMonth(history.items, year), [history.items, year]);

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
      <ScreenHeader title="Historial" back="Preguntas" />
      <Input
        icon="search"
        value={text}
        onChangeText={setText}
        placeholder="Buscar en lo que han contestado"
        accessibilityLabel="Buscar en el historial"
        returnKeyType="search"
        autoCorrect={false}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
        style={{ marginRight: -spacing.xl }}
      >
        <Chip label="Todas" selected={category === null} onPress={() => setCategory(null)} />
        {categories.map((c) => (
          <Chip
            key={c.slug}
            label={c.name}
            selected={category === c.slug}
            onPress={() => setCategory(category === c.slug ? null : c.slug)}
          />
        ))}
      </ScrollView>
    </View>
  );

  let empty;
  if (history.isLoading) {
    empty = (
      <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
        <LoadingSymbol accessibilityLabel="Cargando el historial" />
      </View>
    );
  } else if (history.isError) {
    empty = (
      <EmptyState
        art="circles"
        title="No pudimos abrir el historial"
        body="Tu celular está sin señal con el servidor. Revisa tu internet y vuelve a intentar."
        action={{ label: 'Reintentar', onPress: () => void history.refetch() }}
      />
    );
  } else if (filtering) {
    empty = (
      <EmptyState
        art="bubble"
        title="Nada por aquí"
        body="No encontramos ninguna respuesta con eso. Prueba otra palabra o cambia la categoría."
        action={{
          label: 'Quitar filtros',
          onPress: () => {
            setText('');
            setCategory(null);
          },
        }}
      />
    );
  } else {
    empty = (
      <EmptyState
        art="bubble"
        title="Todavía no han contestado nada"
        body="La primera pregunta siempre da nervios."
        action={{ label: 'Ir a la pregunta de hoy', onPress: () => router.push('/question') }}
      />
    );
  }

  const renderRow = ({ item: row }: { item: HistoryRow }) =>
    row.kind === 'month' ? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: spacing.sm,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
        }}
      >
        <Text variant="h3" accessibilityRole="header">
          {row.label}
        </Text>
        <Text variant="note" tone="muted">
          {row.count === 1 ? '1 pregunta' : `${row.count} preguntas`}
        </Text>
      </View>
    ) : (
      <View style={{ paddingBottom: spacing.sm }}>
        <HistoryCard
          item={row.item}
          partnerName={partnerName}
          timeZone={timeZone}
          onPress={() =>
            router.push({ pathname: '/question', params: { id: row.item.question.id } })
          }
        />
      </View>
    );

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          history.isFetchingNextPage ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              <LoadingSymbol size={32} accessibilityLabel="Cargando más" />
            </View>
          ) : (
            <View style={{ height: spacing.xl }} />
          )
        }
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={history.isRefetching && !history.isFetchingNextPage}
            onRefresh={() => void history.refetch()}
            tintColor={fruit.me.hex}
            colors={[fruit.me.hex]}
          />
        }
      />
    </Screen>
  );
}

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';

import {
  Chip,
  CloudOff,
  EmptyState,
  IconButton,
  Input,
  LoadingLines,
  PencilNote,
  Screen,
  Text,
} from '@/components';
import { useCouple, useToday } from '@/features/couple';
import { useCategories, useHistory } from '@/features/questions';
import { HistoryCard } from '@/features/questions/components/HistoryCard';
import { categoryColor } from '@/lib/questionsView';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useTheme } from '@/theme';

export default function HistoryScreen() {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const { partner } = useCouple();
  const { timeZone } = useToday();
  const { categories } = useCategories();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const search = useDebouncedValue(text.trim(), 300);
  const history = useHistory({ search, category });
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';
  const filtering = search.length > 0 || category !== null;

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
      <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
        <IconButton name="back" accessibilityLabel="Volver" onPress={() => router.back()} />
      </View>
      <Text variant="display" accessibilityRole="header">
        Historial
      </Text>
      <Input
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
        contentContainerStyle={{
          gap: spacing.sm,
          paddingVertical: spacing.xs,
          paddingRight: spacing.lg,
        }}
        style={{ marginRight: -spacing.lg }}
      >
        <Chip label="Todas" selected={category === null} onPress={() => setCategory(null)} />
        {categories.map((c) => (
          <Chip
            key={c.slug}
            label={c.name}
            color={categoryColor(c.slug, c.intensity)}
            selected={category === c.slug}
            onPress={() => setCategory(category === c.slug ? null : c.slug)}
          />
        ))}
      </ScrollView>
    </View>
  );

  let empty;
  if (history.isLoading) {
    empty = <LoadingLines count={5} accessibilityLabel="Cargando el historial" />;
  } else if (history.isError) {
    empty = (
      <EmptyState
        illustration={<CloudOff />}
        title="No pudimos abrir el historial"
        body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
        actionLabel="Reintentar"
        onAction={() => void history.refetch()}
      />
    );
  } else if (filtering) {
    empty = (
      <EmptyState
        illustration={<PencilNote />}
        title="Nada por aquí"
        body="No encontramos ninguna respuesta con eso. Prueba otra palabra o cambia la categoría."
        actionLabel="Quitar filtros"
        onAction={() => {
          setText('');
          setCategory(null);
        }}
      />
    );
  } else {
    empty = (
      <EmptyState
        illustration={<PencilNote />}
        title="Todavía no han contestado nada"
        body="La primera pregunta siempre da nervios."
        actionLabel="Ir a la pregunta de hoy"
        onAction={() => router.push('/question')}
      />
    );
  }

  return (
    <Screen>
      <FlatList
        data={history.items}
        keyExtractor={(item) => item.question.id}
        renderItem={({ item }) => (
          <HistoryCard
            item={item}
            partnerName={partnerName}
            timeZone={timeZone}
            onPress={() => router.push({ pathname: '/question', params: { id: item.question.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          history.isFetchingNextPage ? (
            <LoadingLines count={2} />
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
            tintColor={colors.jamaica}
            colors={[colors.jamaica]}
            progressBackgroundColor={colors.paperRaised}
          />
        }
      />
    </Screen>
  );
}

import { Pressable, View } from 'react-native';

import { Button, Card, Divider, Icon, Text } from '@/components';
import { HomePrompt } from '@/features/home/components/HomePrompt';
import { homeLists, listKindLabel, progressLabel } from '@/lib/lists';
import { useTheme } from '@/theme';

import type { List } from '../api';
import { LIST_KIND_ICON, ProgressBar } from './ListsView';

type Props = {
  lists: readonly List[];
  onOpenList: (id: string) => void;
  onOpenAll: () => void;
};

/** Listas en Inicio: hasta tres con su avance y "Ver todas". Sin listas, una invitación de una línea. */
export function HomeListsCard({ lists, onOpenList, onOpenAll }: Props) {
  const { spacing } = useTheme();
  if (lists.length === 0) {
    return <HomePrompt icon="lists" text="Crear una lista" onPress={onOpenAll} />;
  }
  const { shown, hidden } = homeLists(lists);
  return (
    <Card style={{ padding: 20, gap: spacing.xs }}>
      <Text variant="label" tone="muted" accessibilityRole="header">
        Listas
      </Text>
      {shown.map((list, i) => {
        const progress = progressLabel(list.doneCount, list.itemCount);
        return (
          <View key={list.id}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${list.title}, ${listKindLabel(list.kind)}, ${progress}`}
              onPress={() => onOpenList(list.id)}
              style={{ paddingVertical: spacing.md, gap: spacing.sm, minHeight: 48 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                {list.emoji ? (
                  <Text variant="ui">{list.emoji}</Text>
                ) : (
                  <Icon name={LIST_KIND_ICON[list.kind] ?? 'list'} size={20} />
                )}
                <Text variant="ui" numberOfLines={1} style={{ flex: 1 }}>
                  {list.title}
                </Text>
                <Text variant="note" tone="muted">
                  {progress}
                </Text>
              </View>
              {list.itemCount > 0 ? (
                <ProgressBar done={list.doneCount} total={list.itemCount} />
              ) : null}
            </Pressable>
          </View>
        );
      })}
      <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
        <Button
          title={hidden > 0 ? `Ver todas (${lists.length})` : 'Ver todas'}
          variant="ghost"
          size="sm"
          onPress={onOpenAll}
        />
      </View>
    </Card>
  );
}

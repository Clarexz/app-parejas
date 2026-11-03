import { useRouter } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';

import {
  EmptyState,
  ListRow,
  LoadingSymbol,
  Notice,
  Screen,
  ScreenHeader,
  Text,
  Toggle,
} from '@/components';
import { useCouple } from '@/features/couple';
import { StoryThumb, useStoryArchive, useStoryArchiveSetting } from '@/features/stories';
import { archiveByMonth } from '@/lib/stories';
import { useTheme } from '@/theme';

export default function StoryArchiveScreen() {
  const { spacing, page, fruit } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { couple } = useCouple();
  const archive = useStoryArchive();
  const setting = useStoryArchiveSetting();
  const timeZone = couple?.timezone ?? 'America/Mexico_City';
  const groups = archiveByMonth(archive.stories, timeZone);

  const gap = spacing.md;
  const thumbW = Math.floor((Math.min(width, 520) - page.gutter * 2 - gap * 2) / 3);

  return (
    <Screen scroll refreshing={archive.isRefetching} onRefresh={() => void archive.refetch()}>
      <ScreenHeader
        title="Mi archivo"
        back
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/stories'))}
      />
      <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
        <View style={{ gap: spacing.xs }}>
          <ListRow
            label="Guardar mis stories"
            divider={false}
            right={
              <Toggle
                value={setting.enabled}
                onValueChange={setting.setEnabled}
                disabled={setting.isLoading}
                accessibilityLabel="Guardar mis stories en mi archivo"
              />
            }
          />
          <Text variant="note" tone="muted">
            Solo tú las ves aquí. Si lo apagas, las que pasen de 24 horas se borran en la siguiente
            hora.
          </Text>
        </View>

        {archive.isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl }}>
            <LoadingSymbol />
          </View>
        ) : archive.isError ? (
          <Notice
            tone="danger"
            action={{ label: 'Reintentar', onPress: () => void archive.refetch() }}
          >
            No pudimos abrir tu archivo. Revisa tu internet y vuelve a intentar.
          </Notice>
        ) : groups.length === 0 ? (
          <EmptyState
            art="dome"
            title="Todavía no hay nada"
            body="Aquí se quedan tus stories cuando cumplen 24 horas. Cuando haya una, la verás aquí."
          />
        ) : (
          groups.map((g) => (
            <View key={g.key} style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                <Text variant="h3" accessibilityRole="header">
                  {g.label.toLocaleLowerCase('es-MX')}
                </Text>
                <Text variant="note" tone="muted">
                  {g.items.length}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, rowGap: spacing.lg }}>
                {g.items.map((s) => (
                  <StoryThumb
                    key={s.id}
                    story={s}
                    width={thumbW}
                    fruit={fruit.me}
                    onPress={() =>
                      router.push({ pathname: '/story/view', params: { story: s.id } })
                    }
                    accessibilityLabel={`Story del ${new Date(s.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone })}`}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

import { useRouter } from 'expo-router';
import { View } from 'react-native';

import {
  CloudOff,
  EmptyPolaroid,
  EmptyState,
  IconButton,
  LoadingLines,
  PageHeader,
  Screen,
  Stamp,
  Text,
  Toggle,
} from '@/components';
import { useCouple } from '@/features/couple';
import { StoryPolaroid, useStoryArchive, useStoryArchiveSetting } from '@/features/stories';
import { isStoryActive, archiveByMonth } from '@/lib/stories';
import { todayIn } from '@/lib/dates';
import { shortStamp } from '@/lib/questionsView';
import { useTheme } from '@/theme';

/** "29 OCT": día y mes del sello. */
function dayStamp(iso: string, timeZone: string): string {
  return shortStamp(todayIn(timeZone, new Date(iso)))
    .split(' ')
    .slice(0, 2)
    .join(' ');
}

export default function StoryArchiveScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { couple } = useCouple();
  const archive = useStoryArchive();
  const setting = useStoryArchiveSetting();
  const timeZone = couple?.timezone ?? 'America/Mexico_City';
  const groups = archiveByMonth(archive.stories, timeZone);
  const now = new Date();

  return (
    <Screen scroll refreshing={archive.isRefetching} onRefresh={() => void archive.refetch()}>
      <PageHeader
        stamp="ARCHIVO"
        title="Mi archivo"
        right={
          <IconButton
            name="back"
            accessibilityLabel="Volver"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/stories'))}
          />
        }
      />
      <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="bodyStrong">Guardar mis stories en mi archivo</Text>
            <Text variant="small" tone="muted">
              Solo tú las ves aquí. Si lo apagas, las que pasen de 24 horas se borran en la
              siguiente hora.
            </Text>
          </View>
          <Toggle
            value={setting.enabled}
            onValueChange={setting.setEnabled}
            disabled={setting.isLoading}
            accessibilityLabel="Guardar mis stories en mi archivo"
          />
        </View>

        {archive.isLoading ? (
          <LoadingLines count={4} accessibilityLabel="Cargando tu archivo" />
        ) : archive.isError ? (
          <EmptyState
            illustration={<CloudOff />}
            title="No pudimos abrir tu archivo"
            body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
            actionLabel="Reintentar"
            onAction={() => void archive.refetch()}
          />
        ) : groups.length === 0 ? (
          <EmptyState
            illustration={<EmptyPolaroid />}
            title="Todavía no hay nada"
            body="Aquí se quedan tus stories cuando cumplen 24 horas. Todavía no hay ninguna."
          />
        ) : (
          groups.map((g) => (
            <View key={g.key} style={{ gap: spacing.lg }}>
              <Stamp tone="ink">{g.label}</Stamp>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  columnGap: spacing.lg,
                  rowGap: spacing.xl,
                }}
              >
                {g.items.map((s, i) => (
                  <View
                    key={s.id}
                    style={{ width: '45%', alignItems: i % 2 === 0 ? 'flex-start' : 'flex-end' }}
                  >
                    <StoryPolaroid
                      story={s}
                      size="S"
                      tilt={i % 2 === 0 ? -2 : 2}
                      date={dayStamp(s.created_at, timeZone)}
                      caption={isStoryActive(s, now) ? 'activa' : undefined}
                      onPress={() =>
                        router.push({ pathname: '/story/view', params: { story: s.id } })
                      }
                      accessibilityLabel={`Story del ${dayStamp(s.created_at, timeZone)}${isStoryActive(s, now) ? ', sigue activa' : ''}`}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

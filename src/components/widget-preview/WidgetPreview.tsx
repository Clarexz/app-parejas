// Web (solo QA visual): sustituto con componentes del sistema que imita cada widget. En Android
// se usa `WidgetPreview.android.tsx`, que dibuja el widget real.
import { View } from 'react-native';

import { Doodle } from '@/components/Doodle';
import { Note } from '@/components/Note';
import { Stamp } from '@/components/Stamp';
import { Sticker } from '@/components/Sticker';
import { Tape, type TapeColor } from '@/components/Tape';
import { Text } from '@/components/Text';
import { StoryFrame } from '@/features/stories/components/StoryFrame';
import { formatDaysUntil, formatNumber } from '@/lib/dates';
import { formatStampIsoDate } from '@/lib/stampDate';
import { useTheme } from '@/theme';

import type { WidgetPreviewProps } from './types';

const TAPE: Record<WidgetPreviewProps['name'], TapeColor> = {
  DaysTogether: 'yellow',
  PartnerMood: 'mint',
  Countdown: 'pink',
  PartnerStory: 'pink',
};

export function WidgetPreview({ name, model, width, height }: WidgetPreviewProps) {
  const { colors, spacing, radius } = useTheme();
  const days = model.daysTogether ?? model.daysUntilStart;
  const event = model.nextEvent;
  const story = model.partnerStory;
  const mood = model.partnerMood;
  return (
    <View
      accessible
      accessibilityLabel={`Vista previa del widget ${name}`}
      style={{
        width,
        height,
        backgroundColor: colors.paper,
        borderColor: colors.ruled,
        borderWidth: 1,
        borderRadius: radius.sm * 2,
        overflow: 'hidden',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
      }}
    >
      <View style={{ position: 'absolute', top: -4, right: spacing.xl }}>
        <Tape color={TAPE[name]} />
      </View>
      {name === 'DaysTogether' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View>
            <Text variant="display">{days === null ? '—' : formatNumber(days)}</Text>
            <Doodle kind="underline" />
            <Text variant="small" tone="muted">
              {model.daysUntilStart !== null ? 'días para empezar' : 'días juntos'}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: spacing.sm }}>
            <Stamp>{formatStampIsoDate(model.today)}</Stamp>
            <Text variant="hand" numberOfLines={1}>
              {`con ${model.partnerName}`}
            </Text>
          </View>
        </View>
      ) : null}
      {name === 'PartnerMood' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Sticker emoji={mood?.emoji ?? '…'} tone="postit" tilt={-2} />
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text variant="hand" numberOfLines={1}>
              {model.partnerName}
            </Text>
            <Text variant="small" tone="muted" numberOfLines={1}>
              {[mood?.label, mood?.ago].filter(Boolean).join(' · ')}
            </Text>
            {mood?.note ? (
              <Note tape={false} tilt={0}>
                <Text variant="handSmall" numberOfLines={2} style={{ color: colors.onPostit }}>
                  {mood.note}
                </Text>
              </Note>
            ) : null}
          </View>
        </View>
      ) : null}
      {name === 'Countdown' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text
              variant="title"
              tone={event && event.daysUntil <= 1 ? 'jamaica' : 'ink'}
              numberOfLines={1}
            >
              {event ? (event.daysUntil === 0 ? '¡hoy!' : formatDaysUntil(event.daysUntil)) : '—'}
            </Text>
            <Text variant="small" tone="muted" numberOfLines={2}>
              {event?.title ?? 'Nada a la vista'}
            </Text>
          </View>
          {event ? <Stamp>{formatStampIsoDate(event.date)}</Stamp> : null}
        </View>
      ) : null}
      {name === 'PartnerStory' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {story ? (
            <>
              <StoryFrame
                story={{
                  kind: story.kind,
                  text: story.text,
                  bg: story.bg,
                  font: story.font,
                  strokes: story.strokes,
                }}
                width={Math.round(((height - spacing.lg * 2) * 9) / 16)}
                mediaUrl={story.thumb}
              />
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <Text variant="hand" numberOfLines={1}>
                  {model.partnerName}
                </Text>
                <Text variant="small" tone="muted" numberOfLines={1}>
                  {story.ago}
                </Text>
              </View>
            </>
          ) : (
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="hand" numberOfLines={2}>
                {`${model.partnerName} no ha pegado nada hoy`}
              </Text>
              <Text variant="small" tone="jamaica">
                Pégale una tú
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

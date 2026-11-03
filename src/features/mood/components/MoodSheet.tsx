import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Input, Sheet, Text, useToast } from '@/components';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { MOOD_NOTE_MAX, MOOD_OPTIONS } from '@/lib/mood';
import { useTheme } from '@/theme';

import type { Mood } from '../api';
import { useSetMood } from '../hooks';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Mi mood actual: se preselecciona (con su nota). */
  current?: Mood | null;
};

function MoodForm({
  current,
  onSubmit,
}: {
  current?: Mood | null;
  onSubmit: (value: { emoji: string; note: string }) => void;
}) {
  const { colors, spacing, radius } = useTheme();
  const [emoji, setEmoji] = useState(current?.emoji ?? '');
  const [note, setNote] = useState(current?.note ?? '');

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs }}>
        {MOOD_OPTIONS.map((option) => {
          const selected = option.emoji === emoji;
          return (
            <View key={option.emoji} style={{ width: '25%', padding: spacing.xs }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
                onPress={() => {
                  haptic.light();
                  setEmoji(option.emoji);
                }}
                style={({ pressed }) => ({
                  minHeight: 92,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: spacing.sm,
                  gap: spacing.xxs,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderWidth: 2,
                  borderColor: selected ? colors.ink : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  variant="display"
                  maxFontSizeMultiplier={1.2}
                  style={{ fontSize: 32, lineHeight: 38 }}
                >
                  {option.emoji}
                </Text>
                <Text
                  variant="note"
                  tone="muted"
                  numberOfLines={2}
                  style={{ fontSize: 12, lineHeight: 15, textAlign: 'center' }}
                >
                  {option.label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={{ gap: spacing.xs }}>
        <Input
          label="¿Algo más? (opcional)"
          value={note}
          onChangeText={setNote}
          maxLength={MOOD_NOTE_MAX}
          returnKeyType="done"
        />
        <Text variant="note" tone="muted" style={{ textAlign: 'right' }}>
          {Array.from(note).length}/{MOOD_NOTE_MAX}
        </Text>
      </View>
      <Button
        title="Compartir mi mood"
        fullWidth
        disabled={!emoji}
        onPress={() => onSubmit({ emoji, note })}
      />
    </View>
  );
}

/** Selector de mood: rejilla 4×4 en `surface` + nota opcional sobre un `Sheet` (DISENO §7). */
export function MoodSheet({ visible, onClose, current }: Props) {
  const toast = useToast();
  const setMood = useSetMood();

  const submit = (value: { emoji: string; note: string }) => {
    setMood.mutate(value, {
      onError: (e) => {
        haptic.error();
        toast.show({ message: errorMessage(e), tone: 'error' });
      },
    });
    haptic.light();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="¿Cómo te sientes?">
      <MoodForm current={current} onSubmit={submit} />
    </Sheet>
  );
}

import { Pressable, View } from 'react-native';

import { formatTimeFriendly, MINUTE_STEP, splitTime, stepHour, stepMinute } from '@/lib/timeField';
import { useTheme } from '@/theme';

import { Text } from './Text';

type Props = {
  label?: string;
  /** 'HH:MM' en 24 h. */
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
};

type StepProps = {
  sign: '−' | '+';
  label: string;
  onPress: () => void;
  disabled: boolean;
};

function Step({ sign, label, onPress, disabled }: StepProps) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: disabled ? colors.inkFaint : colors.ink,
        borderRadius: radius.xs,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text variant="heading" style={{ color: disabled ? colors.inkFaint : colors.ink }}>
        {sign}
      </Text>
    </Pressable>
  );
}

/**
 * Hora como sello de fechador: HH : MM en Courier Prime 700 con botones − / + (hora de 1 en 1,
 * minutos de 15 en 15) y la hora escrita en lenguaje normal debajo (DISENO §7).
 */
export function TimeField({ label, value, onChange, disabled = false }: Props) {
  const { colors, spacing, radius, type, fonts } = useTheme();
  const { hour, minute } = splitTime(value);
  const box = {
    ...type.mono,
    fontFamily: fonts.monoBold,
    fontSize: type.title.fontSize,
    lineHeight: type.title.lineHeight + 4,
    letterSpacing: 1,
    minWidth: 76,
    textAlign: 'center' as const,
    color: disabled ? colors.inkFaint : colors.ink,
    backgroundColor: colors.paperRaised,
    borderWidth: 1.5,
    borderColor: disabled ? colors.inkFaint : colors.ink,
    borderRadius: radius.xs,
    paddingVertical: spacing.xs,
  };

  return (
    <View
      accessible={false}
      style={{ gap: spacing.xs, opacity: disabled ? 0.7 : 1, alignItems: 'flex-start' }}
    >
      {label ? (
        <Text variant="hand" tone="muted">
          {label}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ gap: spacing.sm, alignItems: 'center' }}>
          <Text accessibilityRole="text" accessibilityLabel={`Hora: ${hour}`} style={box}>
            {String(hour).padStart(2, '0')}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Step
              sign="−"
              label="Una hora menos"
              disabled={disabled}
              onPress={() => onChange(stepHour(value, -1))}
            />
            <Step
              sign="+"
              label="Una hora más"
              disabled={disabled}
              onPress={() => onChange(stepHour(value, 1))}
            />
          </View>
        </View>
        <Text variant="title" tone="faint" style={{ paddingTop: spacing.xs }}>
          :
        </Text>
        <View style={{ gap: spacing.sm, alignItems: 'center' }}>
          <Text accessibilityRole="text" accessibilityLabel={`Minutos: ${minute}`} style={box}>
            {String(minute).padStart(2, '0')}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Step
              sign="−"
              label={`${MINUTE_STEP} minutos menos`}
              disabled={disabled}
              onPress={() => onChange(stepMinute(value, -1))}
            />
            <Step
              sign="+"
              label={`${MINUTE_STEP} minutos más`}
              disabled={disabled}
              onPress={() => onChange(stepMinute(value, 1))}
            />
          </View>
        </View>
      </View>
      <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
        {formatTimeFriendly(value)}
      </Text>
    </View>
  );
}

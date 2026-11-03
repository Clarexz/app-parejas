import { Pressable, View } from 'react-native';

import { formatTimeFriendly, MINUTE_STEP, splitTime, stepHour, stepMinute } from '@/lib/timeField';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
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
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface2,
        borderRadius: radius.pill,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Icon name={sign === '+' ? 'plus' : 'minus'} size={20} color={colors.ink} />
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
    ...type.num,
    fontFamily: fonts.display,
    minWidth: 76,
    textAlign: 'center' as const,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  };

  return (
    <View
      accessible={false}
      style={{ gap: spacing.xs, opacity: disabled ? 0.7 : 1, alignItems: 'flex-start' }}
    >
      {label ? (
        <Text variant="ui" tone="muted" style={{ fontSize: 14, lineHeight: 20 }}>
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
        <Text variant="num" tone="muted" style={{ paddingTop: spacing.sm }}>
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
      <Text variant="note" tone="muted" accessibilityLiveRegion="polite">
        {formatTimeFriendly(value)}
      </Text>
    </View>
  );
}

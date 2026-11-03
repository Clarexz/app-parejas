import { Pressable, View } from 'react-native';

import { FRUITS, fruitOptions, type FruitKey, type FruitOption } from '@/lib/fruits';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { BrandSymbol } from './Symbol';
import { Text } from './Text';

type Props = {
  value: FruitKey;
  /** Fruta efectiva de tu pareja; null si todavía no hay pareja. */
  partnerFruit: FruitKey | null;
  partnerName?: string;
  onChange: (key: FruitKey) => void;
};

/** Por qué una fruta no se puede elegir (DISENO §7). */
export function blockedReason(option: FruitOption, partnerName?: string): string | null {
  if (!option.blocked) return null;
  return option.blocked === 'same'
    ? `es de ${partnerName?.trim() || 'tu pareja'}`
    : 'se parece a la suya';
}

const COLUMNS = 4;
const SWATCH = 48;

/**
 * Rejilla de 4 columnas con las 7 frutas (DISENO §7). Las bloqueadas llevan candado y motivo y
 * no se pueden tocar; la sugerida para la pareja se marca; abajo, vista previa con el símbolo.
 */
export function FruitPicker({ value, partnerFruit, partnerName, onChange }: Props) {
  const { colors, spacing, radius } = useTheme();
  const options = fruitOptions(partnerFruit);
  const preview = partnerFruit ?? FRUITS[value].suggested;

  return (
    <View style={{ gap: spacing.lg }}>
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg }}
      >
        {options.map((option) => {
          const { fruit, blocked, suggested } = option;
          const selected = fruit.key === value;
          const reason = blockedReason(option, partnerName);
          const caption = reason ?? (suggested ? 'sugerida' : null);
          return (
            <Pressable
              key={fruit.key}
              accessibilityRole="radio"
              accessibilityLabel={
                reason
                  ? `${fruit.name}, bloqueada: ${reason}`
                  : suggested
                    ? `${fruit.name}, sugerida`
                    : fruit.name
              }
              accessibilityState={{ selected, disabled: !!blocked }}
              disabled={!!blocked}
              onPress={() => onChange(fruit.key)}
              style={{ width: `${100 / COLUMNS}%`, alignItems: 'center', gap: spacing.xs }}
            >
              <View
                style={{
                  width: SWATCH + 12,
                  height: SWATCH + 12,
                  borderRadius: radius.pill,
                  borderWidth: 3,
                  borderColor: selected ? colors.ink : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: blocked ? 0.3 : 1,
                }}
              >
                <View
                  style={{
                    width: SWATCH,
                    height: SWATCH,
                    borderRadius: radius.pill,
                    backgroundColor: fruit.hex,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {blocked ? <Icon name="lock" size={20} color={fruit.on} /> : null}
                  {selected && !blocked ? <Icon name="tick" size={24} color={fruit.on} /> : null}
                </View>
              </View>
              <Text
                variant="ui"
                style={{ fontSize: 14, lineHeight: 20, opacity: blocked ? 0.5 : 1 }}
              >
                {fruit.name}
              </Text>
              {caption ? (
                <Text
                  variant="note"
                  tone="muted"
                  style={{ textAlign: 'center', alignSelf: 'stretch', paddingHorizontal: 8 }}
                >
                  {caption}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View
        accessible
        accessibilityLabel={`Vista previa: ${FRUITS[value].name} y ${FRUITS[preview].name}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          padding: 18,
        }}
      >
        <BrandSymbol size={64} left={value} right={preview} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="h3">Así se ven</Text>
          <Text variant="note" tone="muted">
            {partnerFruit
              ? `Tu ${FRUITS[value].name.toLowerCase()} y su ${FRUITS[partnerFruit].name.toLowerCase()}.`
              : `Tu ${FRUITS[value].name.toLowerCase()}; la de tu pareja llega con ella.`}
          </Text>
        </View>
      </View>
    </View>
  );
}

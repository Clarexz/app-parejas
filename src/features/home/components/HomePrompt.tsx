import { View } from 'react-native';

import { Card, Icon, Text, type IconName } from '@/components';
import { useTheme } from '@/theme';

type Props = {
  icon: IconName;
  text: string;
  onPress: () => void;
};

/** Invitación de una línea para Inicio: ícono, frase y chevrón; toda la tarjeta es tocable. */
export function HomePrompt({ icon, text, onPress }: Props) {
  const { spacing } = useTheme();
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={text}
      style={{ paddingVertical: spacing.md + 2, paddingHorizontal: 18 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Icon name={icon} size={24} />
        <Text variant="ui" style={{ flex: 1 }}>
          {text}
        </Text>
        <Icon name="chevron" size={20} />
      </View>
    </Card>
  );
}

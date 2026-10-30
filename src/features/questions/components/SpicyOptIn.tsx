import { View } from 'react-native';

import { Text, Toggle, useToast } from '@/components';
import { useCouple } from '@/features/couple';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { spicyCopy } from '@/lib/questionsView';
import { useTheme } from '@/theme';

import { useSetSpicyOptIn } from '../hooks';

/** Ajuste de preguntas picantes: mi opt-in, el de mi pareja y el resultado (DISENO §8, ajustes). */
export function SpicyOptIn() {
  const { spacing } = useTheme();
  const toast = useToast();
  const { me, partner, members } = useCouple();
  const setOptIn = useSetSpicyOptIn();
  const partnerName = partner?.nickname || partner?.display_name || 'Tu pareja';
  const copy = spicyCopy(members, me?.id ?? '', partnerName);
  const mine = members.some((m) => m.user_id === me?.id && m.spicy_opt_in);
  const shown = setOptIn.isPending ? (setOptIn.variables ?? mine) : mine;

  const change = (enabled: boolean) =>
    setOptIn.mutate(enabled, {
      onSuccess: (active) => {
        haptic.stamp();
        toast.show({
          message: active
            ? 'Picantes activas para los dos.'
            : enabled
              ? `Listo. Se abren cuando ${partnerName} también quiera.`
              : 'Picantes apagadas.',
          tone: 'success',
        });
      },
      onError: (e) => toast.show({ message: errorMessage(e), tone: 'error' }),
    });

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="small" muted>
        Preguntas picantes
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Text variant="body" style={{ flex: 1 }}>
          Quiero activarlas
        </Text>
        <Toggle
          value={shown}
          onValueChange={change}
          accessibilityLabel="Quiero activar las preguntas picantes"
          disabled={!me || setOptIn.isPending}
        />
      </View>
      <Text variant="body">{copy.partnerLine}</Text>
      <Text variant="body" tone={copy.active ? 'nopal' : 'muted'} accessibilityLiveRegion="polite">
        {copy.result}
      </Text>
      <Text variant="caption" muted>
        Solo se activan si los dos quieren, y cualquiera las puede apagar cuando quiera.
      </Text>
    </View>
  );
}

import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Notice, Text } from '@/components';
import { nextInPack } from '@/lib/packs';
import { PACK_DONE_BODY, PACK_DONE_TITLE, PACK_NEXT_LABEL } from '@/lib/questionCopy';
import { useTheme } from '@/theme';

import { usePacks } from '../hooks';

/**
 * Después de contestar una pregunta de un tema: "Siguiente del tema" (la siguiente sin contestar
 * por mí, con `get_packs` ya refrescado) o "Terminaste el tema".
 */
export function PackNext({ pack, questionId }: { pack: string; questionId: string }) {
  const { spacing } = useTheme();
  const router = useRouter();
  const { packs, isFetching } = usePacks();
  const next = nextInPack(packs, pack, questionId, !isFetching);

  if (next.kind === 'pending') return null;
  if (next.kind === 'finished') {
    return (
      <Notice tone="success">
        <View style={{ gap: spacing.xxs }}>
          <Text variant="bodyStrong">{PACK_DONE_TITLE}</Text>
          <Text variant="note" tone="muted">
            {PACK_DONE_BODY}
          </Text>
        </View>
      </Notice>
    );
  }
  return (
    <Button
      title={PACK_NEXT_LABEL}
      fullWidth
      onPress={() =>
        router.replace({ pathname: '/question', params: { id: next.questionId, pack } })
      }
    />
  );
}

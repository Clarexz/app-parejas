import { View } from 'react-native';

import { Note, Polaroid, Screen, Stamp, Text } from '@/components';
import { initialOf } from '@/components/Avatar';
import { useCouple } from '@/features/couple';
import { useSignedUrl, type Profile } from '@/features/profile';
import { formatStampDate } from '@/lib/stampDate';
import { useTheme } from '@/theme';

function PersonPolaroid({
  profile,
  fallback,
  tape,
}: {
  profile: Profile | null;
  fallback: string;
  tape: 'yellow' | 'mint';
}) {
  const { colors } = useTheme();
  const url = useSignedUrl(profile?.avatar_path);
  const label = profile?.nickname || profile?.display_name || fallback;
  return (
    <Polaroid
      id={profile?.id ?? fallback}
      size="M"
      tape={tape}
      caption={label}
      source={url ?? undefined}
      accessibilityLabel={label}
    >
      <Text variant="hero" style={{ color: colors.inkMuted }}>
        {initialOf(label)}
      </Text>
    </Polaroid>
  );
}

export default function HomeScreen() {
  const { spacing, colors } = useTheme();
  const { me, partner } = useCouple();
  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
          <Stamp>{formatStampDate(new Date())}</Stamp>
          <Text variant="display" accessibilityRole="header">
            Ustedes dos
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, paddingTop: spacing.sm }}>
          <PersonPolaroid profile={me} fallback="Tú" tape="yellow" />
          <PersonPolaroid profile={partner} fallback="Tu pareja" tape="mint" />
        </View>
        <Note tilt={1} tape={false}>
          <Text variant="hand" style={{ color: colors.onPostit }}>
            El Inicio completo llega en la próxima versión. Por ahora, aquí están ustedes.
          </Text>
        </Note>
      </View>
    </Screen>
  );
}

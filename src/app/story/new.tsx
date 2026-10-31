import { useLocalSearchParams } from 'expo-router';

import { StoryComposer, parseComposerKind } from '@/features/stories';

export default function NewStoryScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  return <StoryComposer kind={parseComposerKind(kind)} />;
}

import { useLocalSearchParams } from 'expo-router';

import { StoryViewer } from '@/features/stories';

export default function StoryViewScreen() {
  const { user, story } = useLocalSearchParams<{ user?: string; story?: string }>();
  return <StoryViewer userId={user ?? null} storyId={story ?? null} />;
}

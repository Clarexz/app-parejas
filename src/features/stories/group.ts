import { groupStories, type StoryKind } from '@/lib/stories';

import type { Story } from './api';

/** `kind` viene de la BD como `string`; la lógica pura lo pide acotado. */
export type TypedStory = Story & { kind: StoryKind };

/**
 * Stories activas separadas en las mías y las de mi pareja (de la más vieja a la más nueva), con
 * cuántas de tu pareja no has visto. Envuelve `groupStories` calculando las vistas desde `views`.
 */
export function groupActive(
  stories: Story[],
  myId: string | null | undefined,
  partnerId: string | null | undefined,
  now: Date = new Date(),
) {
  const seen = new Set(
    stories.filter((s) => s.views.some((v) => v.user_id === myId)).map((s) => s.id),
  );
  return groupStories(stories as TypedStory[], myId ?? '', partnerId ?? null, seen, now);
}

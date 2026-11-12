/** Voto de una pregunta: 1 = 👍, -1 = 👎, null = sin voto. */
export type FeedbackVote = 1 | -1 | null;

/** Tocar el voto que ya tengo lo quita; tocar el otro lo cambia. */
export function nextFeedbackVote(current: FeedbackVote, tapped: 1 | -1): FeedbackVote {
  return current === tapped ? null : tapped;
}

/** Lo que se lee de `question_feedback.vote` (smallint) a un voto válido. */
export function parseFeedbackVote(value: number | null | undefined): FeedbackVote {
  return value === 1 || value === -1 ? value : null;
}

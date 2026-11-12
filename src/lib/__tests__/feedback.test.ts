import { nextFeedbackVote, parseFeedbackVote } from '../feedback';

describe('feedback', () => {
  it('tocar el mismo voto lo quita y el otro lo cambia', () => {
    expect(nextFeedbackVote(null, 1)).toBe(1);
    expect(nextFeedbackVote(1, 1)).toBeNull();
    expect(nextFeedbackVote(1, -1)).toBe(-1);
    expect(nextFeedbackVote(-1, -1)).toBeNull();
  });

  it('solo acepta 1 y -1', () => {
    expect(parseFeedbackVote(1)).toBe(1);
    expect(parseFeedbackVote(-1)).toBe(-1);
    expect(parseFeedbackVote(0)).toBeNull();
    expect(parseFeedbackVote(null)).toBeNull();
    expect(parseFeedbackVote(undefined)).toBeNull();
  });
});

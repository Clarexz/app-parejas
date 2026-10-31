import quizJson from '../../../content/love-languages.json';
import {
  comparisonHeadline,
  compareLoveLanguages,
  parseLoveLanguagesOverview,
  primaryLabel,
  primaryLanguages,
  rankLanguages,
  scoreAnswers,
  validateLoveLanguageQuiz,
  type LoveLanguageQuiz,
  type LoveLanguageScores,
} from '../loveLanguages';

const quiz = quizJson as LoveLanguageQuiz;
const s = (p: Partial<LoveLanguageScores>): LoveLanguageScores => ({
  words: 0,
  time: 0,
  gifts: 0,
  acts: 0,
  touch: 0,
  ...p,
});

describe('loveLanguages', () => {
  it('el JSON real del test es válido', () => {
    expect(validateLoveLanguageQuiz(quiz)).toEqual([]);
  });

  it('la validación detecta problemas', () => {
    const bad = { ...quiz, items: quiz.items.slice(1) };
    expect(validateLoveLanguageQuiz(bad).length).toBeGreaterThan(0);
  });

  it('scoreAnswers cuenta e ignora desconocidos', () => {
    expect(scoreAnswers(['time', 'time', 'touch', 'foo', ''])).toEqual(s({ time: 2, touch: 1 }));
  });

  it('rankLanguages ordena, calcula share y respeta el orden en empates', () => {
    const r = rankLanguages(s({ words: 3, time: 6, touch: 3 }));
    expect(r.map((x) => x.key)).toEqual(['time', 'words', 'touch', 'gifts', 'acts']);
    expect(r[0]!.share).toBeCloseTo(0.5);
    expect(rankLanguages(s({})).every((x) => x.share === 0)).toBe(true);
  });

  it('primaryLanguages incluye empates y vacío si todo es 0', () => {
    expect(primaryLanguages(s({ gifts: 5, acts: 5, words: 2 }))).toEqual(['gifts', 'acts']);
    expect(primaryLanguages(s({}))).toEqual([]);
  });

  it('compareLoveLanguages', () => {
    const a = compareLoveLanguages(s({ time: 9 }), s({ time: 8, touch: 2 }));
    expect(a).toMatchObject({ sharedPrimary: ['time'], same: true });
    const b = compareLoveLanguages(s({ time: 9 }), s({ touch: 8 }));
    expect(b).toMatchObject({ sharedPrimary: [], same: false });
    const c = compareLoveLanguages(s({ time: 5, gifts: 5 }), s({ time: 6 }));
    expect(c).toMatchObject({ sharedPrimary: ['time'], same: false });
  });

  it('primaryLabel y comparisonHeadline', () => {
    expect(primaryLabel(['time'], quiz.languages)).toBe('Tiempo de calidad');
    expect(primaryLabel(['time', 'gifts'], quiz.languages)).toMatch(/^Tiempo de calidad y /);
    expect(primaryLabel([], quiz.languages)).toBe('');
    expect(comparisonHeadline(s({ time: 9 }), s({ time: 8 }), quiz.languages, 'Ale')).toBe(
      'Los dos hablan Tiempo de calidad',
    );
    expect(comparisonHeadline(s({ time: 9 }), s({ touch: 8 }), quiz.languages, 'Ale')).toMatch(
      /^Tú hablas Tiempo de calidad; Ale, /,
    );
  });

  it('parseLoveLanguagesOverview tolera nulos', () => {
    expect(parseLoveLanguagesOverview(null)).toEqual({
      mine: null,
      partner: null,
      partnerDone: false,
    });
    const o = parseLoveLanguagesOverview({
      mine: { user_id: 'u1', answers: ['time', 'time'] },
      partner: null,
      partner_done: true,
    });
    expect(o.mine?.scores.time).toBe(2);
    expect(o.partnerDone).toBe(true);
  });
});

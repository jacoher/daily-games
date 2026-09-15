import { TRIVIA_QUESTIONS, TRIVIA_CATEGORIES } from './trivia-data';

describe('trivia-data', () => {
  it('should only expose the Inteligencia Artificial category', () => {
    expect(TRIVIA_CATEGORIES).toEqual(['Inteligencia Artificial']);
    expect(Object.keys(TRIVIA_QUESTIONS)).toEqual(['Inteligencia Artificial']);
  });

  it('should contain the IA question bank', () => {
    expect(TRIVIA_QUESTIONS['Inteligencia Artificial'].length).toBe(78);
  });

  it('should tag every question with the Inteligencia Artificial category', () => {
    const questions = TRIVIA_QUESTIONS['Inteligencia Artificial'];
    expect(questions.every(q => q.category === 'Inteligencia Artificial')).toBe(true);
  });
});

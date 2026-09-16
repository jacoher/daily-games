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

  it('should have at least 20 questions for each difficulty level', () => {
    const questions = TRIVIA_QUESTIONS['Inteligencia Artificial'];
    const facil = questions.filter(q => q.difficulty === 'facil');
    const medio = questions.filter(q => q.difficulty === 'medio');
    const dificil = questions.filter(q => q.difficulty === 'dificil');

    expect(facil.length).toBeGreaterThanOrEqual(20);
    expect(medio.length).toBeGreaterThanOrEqual(20);
    expect(dificil.length).toBeGreaterThanOrEqual(20);
    expect(facil.length + medio.length + dificil.length).toBe(78);
  });
});


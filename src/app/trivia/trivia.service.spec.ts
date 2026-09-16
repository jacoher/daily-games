import { TestBed } from '@angular/core/testing';
import { TriviaService } from './trivia.service';

describe('TriviaService', () => {
  let service: TriviaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TriviaService);
  });

  it('should load up to the requested number of Inteligencia Artificial questions', () => {
    const questions = service.loadQuestions('Inteligencia Artificial', 10);
    expect(questions.length).toBe(10);
    expect(questions.every(q => q.category === 'Inteligencia Artificial')).toBe(true);
  });

  it('should cap the returned questions at the pool size when count exceeds it', () => {
    const questions = service.loadQuestions('Inteligencia Artificial', 1000);
    expect(questions.length).toBe(78);
  });

  it('should expose only the Inteligencia Artificial category', () => {
    expect(service.categories).toEqual(['Inteligencia Artificial']);
  });

  it('should filter questions by difficulty', () => {
    const facil = service.loadQuestions('Inteligencia Artificial', 10, 'facil');
    expect(facil.length).toBe(10);
    expect(facil.every(q => q.difficulty === 'facil')).toBe(true);

    const medio = service.loadQuestions('Inteligencia Artificial', 10, 'medio');
    expect(medio.length).toBe(10);
    expect(medio.every(q => q.difficulty === 'medio')).toBe(true);

    const dificil = service.loadQuestions('Inteligencia Artificial', 10, 'dificil');
    expect(dificil.length).toBe(10);
    expect(dificil.every(q => q.difficulty === 'dificil')).toBe(true);

    const todas = service.loadQuestions('Inteligencia Artificial', 15, 'todas');
    expect(todas.length).toBe(15);
  });
});


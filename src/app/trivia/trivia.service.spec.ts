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
});

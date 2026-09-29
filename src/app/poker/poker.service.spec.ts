import { TestBed } from '@angular/core/testing';
import { PokerService } from './poker.service';

describe('PokerService', () => {
  let service: PokerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PokerService]
    });
    service = TestBed.inject(PokerService);
  });

  it('should be created and have initial state', () => {
    expect(service).toBeTruthy();
    expect(service.deckType$.value).toBe('fibonacci');
    expect(service.revealed$.value).toBeFalse();
    expect(service.players$.value).toEqual([]);
  });

  it('should compute initial stats with empty players', () => {
    const stats = service.stats$.value;
    expect(stats.isConsensus).toBeFalse();
    expect(stats.average).toBeNull();
  });
});

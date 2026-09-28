import { calculatePokerStats } from './poker-stats.util';

describe('PokerStatsUtil', () => {
  it('should detect consensus when all valid votes match in fibonacci', () => {
    const votes = [
      { name: 'Alice', vote: '5' },
      { name: 'Bob', vote: '5' },
      { name: 'Charlie', vote: '5' }
    ];
    const stats = calculatePokerStats(votes, 'fibonacci');
    expect(stats.isConsensus).toBeTrue();
    expect(stats.consensusValue).toBe('5');
    expect(stats.average).toBe(5);
    expect(stats.hasExtremeDuel).toBeFalse();
  });

  it('should calculate average and detect extreme duel in fibonacci', () => {
    const votes = [
      { name: 'Alice', vote: '2' },
      { name: 'Bob', vote: '5' },
      { name: 'Charlie', vote: '13' }
    ];
    const stats = calculatePokerStats(votes, 'fibonacci');
    expect(stats.isConsensus).toBeFalse();
    expect(stats.average).toBeCloseTo(6.67, 1);
    expect(stats.hasExtremeDuel).toBeTrue();
    expect(stats.duelists?.low.name).toBe('Alice');
    expect(stats.duelists?.high.name).toBe('Charlie');
  });

  it('should ignore special cards (?) and (☕) for numeric average and consensus', () => {
    const votes = [
      { name: 'Alice', vote: '8' },
      { name: 'Bob', vote: '8' },
      { name: 'Charlie', vote: '☕' }
    ];
    const stats = calculatePokerStats(votes, 'fibonacci');
    expect(stats.isConsensus).toBeTrue();
    expect(stats.consensusValue).toBe('8');
    expect(stats.average).toBe(8);
  });

  it('should calculate mode and median for t-shirt sizes', () => {
    const votes = [
      { name: 'Alice', vote: 'S' },
      { name: 'Bob', vote: 'M' },
      { name: 'Charlie', vote: 'M' },
      { name: 'David', vote: 'XL' }
    ];
    const stats = calculatePokerStats(votes, 'tshirt');
    expect(stats.isConsensus).toBeFalse();
    expect(stats.mode).toBe('M');
    expect(stats.hasExtremeDuel).toBeTrue();
    expect(stats.duelists?.low.name).toBe('Alice');
    expect(stats.duelists?.high.name).toBe('David');
  });
});

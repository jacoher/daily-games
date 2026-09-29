import { FIBONACCI_CARDS, PokerDeckType, PokerStats, PokerVoteDistributionItem, TSHIRT_CARDS } from './poker.types';

export function calculatePokerStats(
  votes: Array<{ name: string; vote?: string | null; isSpectator?: boolean }>,
  deckType: PokerDeckType
): PokerStats {
  // Exclude spectators and players without a valid vote
  const eligibleVotes = (votes || []).filter(v => !v.isSpectator);
  const castVotes = eligibleVotes.filter(v => !!v.vote && v.vote !== 'hidden');

  // Build distribution from all cast votes (including ?, ☕, etc.)
  const deckOrder = deckType === 'fibonacci' ? FIBONACCI_CARDS : TSHIRT_CARDS;
  const distributionMap = new Map<string, { count: number; voters: string[] }>();
  for (const v of castVotes) {
    const val = v.vote!;
    if (!distributionMap.has(val)) {
      distributionMap.set(val, { count: 0, voters: [] });
    }
    const item = distributionMap.get(val)!;
    item.count += 1;
    item.voters.push(v.name);
  }

  const totalCast = castVotes.length;
  const distribution: PokerVoteDistributionItem[] = Array.from(distributionMap.entries()).map(([value, item]) => ({
    value,
    count: item.count,
    percentage: totalCast > 0 ? Math.round((item.count / totalCast) * 100) : 0,
    voters: item.voters
  })).sort((a, b) => {
    const idxA = deckOrder.indexOf(a.value);
    const idxB = deckOrder.indexOf(b.value);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.value.localeCompare(b.value);
  });

  const validVotes = castVotes.filter(v => v.vote !== '?' && v.vote !== '☕') as Array<{ name: string; vote: string }>;

  if (validVotes.length === 0) {
    return {
      average: null,
      median: null,
      mode: null,
      isConsensus: false,
      consensusValue: null,
      hasExtremeDuel: false,
      duelists: null,
      distribution
    };
  }

  // Consensus check
  const firstVote = validVotes[0].vote;
  const isConsensus = validVotes.length > 1 && validVotes.every(v => v.vote === firstVote);
  const consensusValue = isConsensus ? firstVote : null;

  // Mode
  const frequency: Record<string, number> = {};
  validVotes.forEach(v => frequency[v.vote] = (frequency[v.vote] || 0) + 1);
  let mode: string | null = null;
  let maxFreq = 0;
  for (const [val, count] of Object.entries(frequency)) {
    if (count > maxFreq) {
      maxFreq = count;
      mode = val;
    }
  }

  if (deckType === 'fibonacci') {
    const numericVotes = validVotes
      .map(v => ({ name: v.name, val: Number(v.vote), voteStr: v.vote }))
      .filter(v => !isNaN(v.val));

    if (numericVotes.length === 0) {
      return { average: null, median: null, mode, isConsensus, consensusValue, hasExtremeDuel: false, duelists: null, distribution };
    }

    numericVotes.sort((a, b) => a.val - b.val);
    const sum = numericVotes.reduce((acc, curr) => acc + curr.val, 0);
    const average = sum / numericVotes.length;

    const mid = Math.floor(numericVotes.length / 2);
    const median = numericVotes.length % 2 !== 0
      ? String(numericVotes[mid].val)
      : String(Math.round(((numericVotes[mid - 1].val + numericVotes[mid].val) / 2) * 10) / 10);

    const min = numericVotes[0];
    const max = numericVotes[numericVotes.length - 1];

    // Extreme duel: gap of >= 2 steps in Fibonacci scale
    const minIndex = FIBONACCI_CARDS.indexOf(min.voteStr);
    const maxIndex = FIBONACCI_CARDS.indexOf(max.voteStr);
    const hasExtremeDuel = maxIndex - minIndex >= 2;

    return {
      average,
      median,
      mode,
      isConsensus,
      consensusValue,
      hasExtremeDuel,
      duelists: hasExtremeDuel ? { low: { name: min.name, vote: min.voteStr }, high: { name: max.name, vote: max.voteStr } } : null,
      distribution
    };
  } else {
    // T-shirt sizes
    const rankMap: Record<string, number> = { XS: 0, S: 1, M: 2, L: 3, XL: 4, XXL: 5 };
    const rankedVotes = validVotes
      .map(v => ({ name: v.name, rank: rankMap[v.vote] ?? -1, voteStr: v.vote }))
      .filter(v => v.rank >= 0);

    rankedVotes.sort((a, b) => a.rank - b.rank);
    const mid = Math.floor(rankedVotes.length / 2);
    const median = rankedVotes.length > 0 ? rankedVotes[mid].voteStr : null;

    const min = rankedVotes[0];
    const max = rankedVotes[rankedVotes.length - 1];
    const hasExtremeDuel = min && max && (max.rank - min.rank >= 2);

    return {
      average: null,
      median,
      mode,
      isConsensus,
      consensusValue,
      hasExtremeDuel: !!hasExtremeDuel,
      duelists: hasExtremeDuel ? { low: { name: min.name, vote: min.voteStr }, high: { name: max.name, vote: max.voteStr } } : null,
      distribution
    };
  }
}

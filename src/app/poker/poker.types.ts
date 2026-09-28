export type PokerDeckType = 'fibonacci' | 'tshirt';

export const FIBONACCI_CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];
export const TSHIRT_CARDS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'];

export interface PokerPlayer {
  socketId: string;
  name: string;
  avatar: string;
  vote?: string;
  hasVoted: boolean;
  connected: boolean;
}

export interface PokerStory {
  id: string;
  title: string;
  estimate?: string;
}

export interface PokerDuelists {
  low: { name: string; vote: string };
  high: { name: string; vote: string };
}

export interface PokerStats {
  average: number | null;
  median: string | null;
  mode: string | null;
  isConsensus: boolean;
  consensusValue: string | null;
  hasExtremeDuel: boolean;
  duelists: PokerDuelists | null;
}

export interface PokerRoomData {
  id: string;
  deckType: PokerDeckType;
  stories: PokerStory[];
  currentStoryIndex: number;
  revealed: boolean;
  players: PokerPlayer[];
}

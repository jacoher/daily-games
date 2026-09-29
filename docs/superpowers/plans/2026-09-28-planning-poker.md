# Epic Planning Poker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an interactive and fun Planning Poker multiplayer minigame with real-time socket communication, QR joining, dynamic voting decks (Fibonacci & T-Shirt), Consensus Party confetti celebrations, Extreme Duel debates, live floating emoji reactions, and tie-breaker roulette.

**Architecture:** Node.js Express + Socket.io backend handling room state and real-time event broadcasting (`poker:*`), paired with an Angular 18 frontend composed of a reactive `PokerService`, `PokerStats` utility, a projection-ready `PokerHostComponent`, and a touch-optimized mobile `PokerPlayerComponent`.

**Tech Stack:** Angular 18 (standalone components, Signals/RxJS), Socket.io & socket.io-client, `canvas-confetti`, `qrcode`, Web Audio (`SoundService`).

## Global Constraints
- Node 18+ / Angular 18 standalone components.
- Do not break existing routes: `/`, `/roulette`, `/marbles`, `/slots`, `/trivia`, `/trivia/play`.
- Socket communication must use namespaced events prefixed with `poker:`.
- Reconnects must preserve existing player votes.

---

### Task 1: Data Models & Statistical Utility (TDD)

**Files:**
- Create: `src/app/poker/poker.types.ts`
- Create: `src/app/poker/poker-stats.util.ts`
- Test: `src/app/poker/poker-stats.util.spec.ts`

**Interfaces:**
- Produces:
  - `PokerDeckType`: `'fibonacci' | 'tshirt'`
  - `PokerStats`: `{ average: number | null, median: string | null, mode: string | null, isConsensus: boolean, consensusValue: string | null, hasExtremeDuel: boolean, duelists: { low: { name: string; vote: string }; high: { name: string; vote: string } } | null }`
  - `calculatePokerStats(votes: Array<{ name: string; vote: string }>, deckType: PokerDeckType): PokerStats`

- [ ] **Step 1: Write the failing tests for statistical calculations**

Create `src/app/poker/poker-stats.util.spec.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false --include=src/app/poker/poker-stats.util.spec.ts`
Expected: FAIL (Cannot find module `./poker-stats.util`)

- [ ] **Step 3: Write types and minimal implementation**

Create `src/app/poker/poker.types.ts`:
```typescript
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
```

Create `src/app/poker/poker-stats.util.ts`:
```typescript
import { FIBONACCI_CARDS, PokerDeckType, PokerStats, TSHIRT_CARDS } from './poker.types';

export function calculatePokerStats(
  votes: Array<{ name: string; vote: string }>,
  deckType: PokerDeckType
): PokerStats {
  const validVotes = votes.filter(v => v.vote && v.vote !== '?' && v.vote !== '☕');

  if (validVotes.length === 0) {
    return {
      average: null,
      median: null,
      mode: null,
      isConsensus: false,
      consensusValue: null,
      hasExtremeDuel: false,
      duelists: null
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
      return { average: null, median: null, mode, isConsensus, consensusValue, hasExtremeDuel: false, duelists: null };
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
      duelists: hasExtremeDuel ? { low: { name: min.name, vote: min.voteStr }, high: { name: max.name, vote: max.voteStr } } : null
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
      duelists: hasExtremeDuel ? { low: { name: min.name, vote: min.voteStr }, high: { name: max.name, vote: max.voteStr } } : null
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --watch=false --include=src/app/poker/poker-stats.util.spec.ts`
Expected: PASS (4 tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/app/poker/poker.types.ts src/app/poker/poker-stats.util.ts src/app/poker/poker-stats.util.spec.ts
git commit -m "feat(poker): add data types and statistics utility with unit tests"
```

---

### Task 2: Backend Socket.io Real-time Handlers

**Files:**
- Modify: `server/index.js`

**Interfaces:**
- Consumes: Socket.io connection from client.
- Produces: `poker:create-room`, `poker:join-room`, `poker:player-joined`, `poker:select-deck`, `poker:set-stories`, `poker:vote`, `poker:vote-status`, `poker:reveal`, `poker:reset`, `poker:reaction`, `poker:sync-room`.

- [ ] **Step 1: Add pokerRooms state and socket event listeners to `server/index.js`**

In `server/index.js`, implement:
- Memory storage: `const pokerRooms = new Map();`
- Event `poker:create-room`: creates room state with ID, deck, stories, participants, returns room info to host.
- Event `poker:join-room`: joins player by roomId, player name & avatar. Notifies room with updated player list.
- Event `poker:vote`: updates player vote secretly, broadcasts `poker:player-voted` with `{ socketId, name, hasVoted: true }`.
- Event `poker:reveal`: marks room revealed, sends full votes and statistical summary.
- Event `poker:reset`: resets player votes for current or next story.
- Event `poker:reaction`: broadcasts `{ emoji, playerName }` to room.
- Event `disconnect`: handles player departure/reconnection.

- [ ] **Step 2: Test socket server endpoints**

Run: `node -e "const http = require('http'); http.get('http://localhost:3001/health', res => { console.log('STATUS:', res.statusCode); });"`
Verify server starts and answers without syntax errors.

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat(poker): add real-time socket handlers for planning poker"
```

---

### Task 3: Poker Angular Service

**Files:**
- Create: `src/app/poker/poker.service.ts`
- Test: `src/app/poker/poker.service.spec.ts`

**Interfaces:**
- Consumes: `socket.io-client`, `PokerRoomData`, `PokerPlayer`, `PokerDeckType`
- Produces: `PokerService` injectable with reactive signals/observables (`room$`, `players$`, `reactions$`, `currentStory$`, methods: `createRoom()`, `joinRoom()`, `vote()`, `reveal()`, `reset()`, `sendReaction()`, `switchDeck()`, `nextStory()`).

- [ ] **Step 1: Write unit test for `PokerService`**

Create `src/app/poker/poker.service.spec.ts` verifying service creation and state handling.

- [ ] **Step 2: Implement `PokerService`**

Implement `src/app/poker/poker.service.ts` with Socket.io connection fallback, event listeners, and reactive subjects.

- [ ] **Step 3: Run tests to verify**

Run: `npx ng test --watch=false --include=src/app/poker/poker.service.spec.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/poker/poker.service.ts src/app/poker/poker.service.spec.ts
git commit -m "feat(poker): implement reactive PokerService client"
```

---

### Task 4: Poker Host Component (Projection & Gamification UI)

**Files:**
- Create: `src/app/poker/poker-host/poker-host.component.ts`
- Create: `src/app/poker/poker-host/poker-host.component.html`
- Create: `src/app/poker/poker-host/poker-host.component.css`

**Interfaces:**
- Consumes: `PokerService`, `ParticipantService`, `SoundService`, `qrcode`, `canvas-confetti`, `calculatePokerStats`.
- Features:
  - Header with room ID, QR code modal, deck switch (`fibonacci` <-> `tshirt`), story navigator.
  - Interactive table showing connected participants, cards face-down / flipped.
  - Floating emoji animation overlay.
  - Celebration banner + Confetti on Consensus Party.
  - VS Duel overlay on Extreme Discrepancy.
  - Interactive Roulette modal for tie-breaker.

- [ ] **Step 1: Create template and CSS with cyber/glass styling matching Daily Games**
- [ ] **Step 2: Implement component logic with sound effects and confetti**
- [ ] **Step 3: Run Angular compilation test**
Run: `npx ng build --configuration development`
Expected: PASS
- [ ] **Step 4: Commit**

```bash
git add src/app/poker/poker-host/
git commit -m "feat(poker): implement PokerHostComponent with gamified interactions"
```

---

### Task 5: Poker Player Component (Mobile Responsive UI)

**Files:**
- Create: `src/app/poker/poker-player/poker-player.component.ts`
- Create: `src/app/poker/poker-player/poker-player.component.html`
- Create: `src/app/poker/poker-player/poker-player.component.css`

**Interfaces:**
- Consumes: `PokerService`, `ActivatedRoute`, `Router`.
- Features:
  - Join view: select from host's pre-loaded participants or enter custom name/avatar.
  - Story header: title and description of story currently being estimated.
  - Card deck carrousel/grid: responsive touch buttons for card selection with active bounce state.
  - Floating emoji reaction bar at the bottom: instant tap to send `🔥`, `💩`, `☕`, `🤯`, `🚀`.
  - Revealed state view showing final results.

- [ ] **Step 1: Create mobile-first touch UI and animations**
- [ ] **Step 2: Implement player joining and voting logic**
- [ ] **Step 3: Run compilation test**
Run: `npx ng build --configuration development`
Expected: PASS
- [ ] **Step 4: Commit**

```bash
git add src/app/poker/poker-player/
git commit -m "feat(poker): implement PokerPlayerComponent for mobile voters"
```

---

### Task 6: Routing, Setup Entry Point & Sound FX Integration

**Files:**
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/setup/setup.component.ts`
- Modify: `src/app/sound.service.ts` (add poker victory/whoosh/fanfare sounds if needed)

**Interfaces:**
- Exposes routes: `/poker` (host) and `/poker/play` (player).
- Setup screen displays new card: "🃏 Planning Poker Épico".

- [ ] **Step 1: Update `app.routes.ts` with lazy/direct routes for host and player**
- [ ] **Step 2: Add Planning Poker game card and navigation in `setup.component.ts`**
- [ ] **Step 3: Run end-to-end build verification**
Run: `npx ng build`
Expected: PASS without errors or warnings.
- [ ] **Step 4: Commit**

```bash
git add src/app/app.routes.ts src/app/setup/setup.component.ts src/app/sound.service.ts
git commit -m "feat(poker): wire up routes, setup launcher card and audio effects"
```

---

### Task 7: Full System Verification & Multiplayer Testing

**Files:**
- Verification only

- [ ] **Step 1: Run all unit tests**
Run: `npx ng test --watch=false`
Expected: All tests pass.

- [ ] **Step 2: Run backend server and test multiplayer simulation**
Verify socket connection, room creation, joining, voting, consensus trigger and reaction emission.

- [ ] **Step 3: Final commit & documentation update**
```bash
git commit --allow-empty -m "chore(poker): complete epic planning poker verification"
```

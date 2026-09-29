# Modern Planning Poker Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the planning poker game mode into a modern virtual poker room styled after planningpokeronline.com, with a central felt table, 3D flipping card seats, live vote distribution bar chart, bottom docked card hand, and spectator mode.

**Architecture:** Extend Poker types and statistical utilities with vote distribution and spectator filtering; update server socket handlers for spectator toggles; replace the basic seat layouts with a responsive oval felt poker table with 3D card animations in both Host and Player components; add a docked card selector and spectator toggle in the player view.

**Tech Stack:** Angular 19, Socket.IO, TypeScript, CSS 3D Transforms (`perspective`, `transform: rotateY`), Jasmine/Karma.

## Global Constraints
- Spec: `docs/superpowers/specs/2026-09-28-planning-poker-modern-table-design.md`
- Maintain backwards compatibility with existing room generation and sound effects
- Spectators (`isSpectator: true`) must never affect quorum, averages, or consensus
- All card flip animations must use hardware-accelerated 3D transforms

---

### Task 1: Extend Poker Types and Stats Calculation with Distribution and Spectators

**Files:**
- Modify: `src/app/poker/poker.types.ts`
- Modify: `src/app/poker/poker-stats.util.ts`
- Test: `src/app/poker/poker-stats.util.spec.ts`

**Interfaces:**
- Consumes: `PokerPlayer`, `PokerDeckType`
- Produces: `PokerVoteDistributionItem`, updated `PokerStats` with `distribution`, and `isSpectator` property on `PokerPlayer`.

- [ ] **Step 1: Write failing unit test for vote distribution and spectator handling**

Add tests to `src/app/poker/poker-stats.util.spec.ts`:
```typescript
it('should calculate vote distribution correctly and ignore spectators', () => {
  const players: PokerPlayer[] = [
    { socketId: '1', name: 'Alice', avatar: 'a1', vote: '5', hasVoted: true, connected: true, isSpectator: false },
    { socketId: '2', name: 'Bob', avatar: 'a2', vote: '5', hasVoted: true, connected: true, isSpectator: false },
    { socketId: '3', name: 'Charlie', avatar: 'a3', vote: '8', hasVoted: true, connected: true, isSpectator: false },
    { socketId: '4', name: 'Dave', avatar: 'a4', vote: undefined, hasVoted: false, connected: true, isSpectator: true }
  ];

  const stats = calculatePokerStats(players, 'fibonacci');
  expect(stats.distribution.length).toBe(2);
  const fiveItem = stats.distribution.find(d => d.value === '5');
  expect(fiveItem?.count).toBe(2);
  expect(fiveItem?.percentage).toBe(67);
  expect(fiveItem?.voters).toEqual(['Alice', 'Bob']);
  const eightItem = stats.distribution.find(d => d.value === '8');
  expect(eightItem?.count).toBe(1);
  expect(eightItem?.percentage).toBe(33);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --include src/app/poker/poker-stats.util.spec.ts --watch=false` or `npx ng test --watch=false`
Expected: FAIL due to missing `distribution` property on `PokerStats`.

- [ ] **Step 3: Implement minimal code in poker.types.ts and poker-stats.util.ts**

Update `src/app/poker/poker.types.ts`:
```typescript
export interface PokerVoteDistributionItem {
  value: string;
  count: number;
  percentage: number;
  voters: string[];
}

export interface PokerPlayer {
  socketId: string;
  name: string;
  avatar: string;
  vote?: string;
  hasVoted: boolean;
  connected: boolean;
  isSpectator?: boolean;
}

export interface PokerStats {
  average: number | null;
  median: string | null;
  mode: string | null;
  isConsensus: boolean;
  consensusValue: string | null;
  hasExtremeDuel: boolean;
  duelists: PokerDuelists | null;
  distribution: PokerVoteDistributionItem[];
}
```

Update `src/app/poker/poker-stats.util.ts` to compute distribution from non-spectator voted players.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/poker/poker.types.ts src/app/poker/poker-stats.util.ts src/app/poker/poker-stats.util.spec.ts
git commit -m "feat(poker): add vote distribution and spectator support in poker stats"
```

---

### Task 2: Server Socket Handling & PokerService Client Updates

**Files:**
- Modify: `server/index.js`
- Modify: `src/app/poker/poker.service.ts`

**Interfaces:**
- Consumes: `poker:join-room`, `poker:toggle-spectator`
- Produces: `PokerService.toggleSpectator(isSpectator: boolean)`, `isSpectator$` observable.

- [ ] **Step 1: Update server/index.js**

Add handler for `poker:toggle-spectator`:
```javascript
socket.on('poker:toggle-spectator', ({ roomId, isSpectator }, callback) => {
  const room = pokerRooms.get(roomId);
  if (!room) return;
  for (const player of room.players.values()) {
    if (player.socketId === socket.id) {
      player.isSpectator = !!isSpectator;
      if (player.isSpectator) {
        player.vote = null;
        player.hasVoted = false;
      }
      break;
    }
  }
  const payload = Array.from(room.players.values()).map(p => ({
    ...p,
    vote: room.revealed ? p.vote : (p.hasVoted ? 'hidden' : null)
  }));
  io.to(room.id).emit(room.revealed ? 'poker:revealed' : 'poker:players-update', room.revealed ? { players: payload, currentStory: room.stories[room.currentStoryIndex] } : payload);
  if (callback) callback({ success: true, isSpectator });
});
```
Update `poker:join-room` to accept `isSpectator?: boolean`.

- [ ] **Step 2: Update PokerService**

In `src/app/poker/poker.service.ts`:
- Add `isSpectator$` BehaviorSubject.
- Add `toggleSpectator(isSpectator: boolean): void` method.
- Update `joinRoom` signature to accept optional `isSpectator`.
- In stats computation, pass updated players array.

- [ ] **Step 3: Test service and server interaction**

Verify TypeScript build passes:
Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add server/index.js src/app/poker/poker.service.ts
git commit -m "feat(poker): implement spectator socket events and service methods"
```

---

### Task 3: Redesign PokerHostComponent with Oval Felt Table, 3D Cards, and Distribution Chart

**Files:**
- Modify: `src/app/poker/poker-host/poker-host.component.html`
- Modify: `src/app/poker/poker-host/poker-host.component.ts`
- Modify: `src/app/poker/poker-host/poker-host.component.css`

**Interfaces:**
- Consumes: `pokerService.players$`, `pokerService.stats$`, `pokerService.revealed$`
- Produces: Virtual felt table UI with radial seated participants, 3D card flip effects, and center distribution breakdown bar chart.

- [ ] **Step 1: Update PokerHostComponent template and logic**
  - Implement `.poker-table-felt` oval layout.
  - Distribute seats around the table perimeter with player avatars and 3D card flipper containers.
  - In the table center:
    - If unrevealed: Show voting progress ring/badge and large "👀 Revelar Cartas" button.
    - If revealed: Show central summary with vote distribution bars (e.g. `[5]: 3 votos (60%)`), Average, Median, Consensus, plus Revote and Settle controls.
  - Filter and badge spectator players with `👁️ Espectador`.

- [ ] **Step 2: Update PokerHostComponent styling**
  - Add realistic casino/poker felt gradients with inner drop-shadows and subtle felt texture.
  - Add 3D card flip styles:
    ```css
    .card-flipper {
      perspective: 800px;
      transform-style: preserve-3d;
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-flipper.flipped {
      transform: rotateY(180deg);
    }
    .card-face {
      backface-visibility: hidden;
    }
    .card-front {
      transform: rotateY(180deg);
    }
    ```
  - Style distribution bars with animated fill percentages and badge counts.

- [ ] **Step 3: Verify build and component compilation**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add src/app/poker/poker-host/
git commit -m "feat(poker): add realistic felt table, 3D card flips and distribution chart to host view"
```

---

### Task 4: Redesign PokerPlayerComponent with Live Felt Table, Docked Card Hand & Spectator Toggle

**Files:**
- Modify: `src/app/poker/poker-player/poker-player.component.html`
- Modify: `src/app/poker/poker-player/poker-player.component.ts`
- Modify: `src/app/poker/poker-player/poker-player.component.css`

**Interfaces:**
- Consumes: `PokerService`, `pokerService.myVote$`, `pokerService.isSpectator$`
- Produces: Synchronized table view, floating bottom card dock for instant voting, tactile lift animations, and role toggle button.

- [ ] **Step 1: Update PokerPlayerComponent template and logic**
  - Add top bar with story info, room code, and Spectator/Voter toggle button.
  - Display the virtual poker table so mobile/desktop players see all participants seated around the table and their cards face-down / flipping.
  - When revealed, display the distribution chart and consensus right on the player's table view.
  - Implement the docked bottom deck (`.bottom-card-dock`) with cards horizontally scrollable, elevation on click, and clear "Votado" state.
  - If in Spectator mode: hide the card dock and show an observant status banner: `👁️ Estás observando la estimación`.

- [ ] **Step 2: Update PokerPlayerComponent styling**
  - Responsive table layout suited for mobile viewport as well as desktop browser.
  - Tactile card animations (`transform: translateY(-14px)` with glow on select).
  - Floating emoji reactions bar integrated seamlessly.

- [ ] **Step 3: Verify build**

Run: `npx ng build`
Expected: SUCCESS

- [ ] **Step 4: Commit**

```bash
git add src/app/poker/poker-player/
git commit -m "feat(poker): add live table view, bottom card dock and spectator toggle to player view"
```

---

### Task 5: End-to-End Verification & Polish

**Files:**
- Review: `server/index.js`, `src/app/poker/**`

- [ ] **Step 1: Run unit tests**

Run: `npm test -- --watch=false`
Expected: All tests pass.

- [ ] **Step 2: Verify application build**

Run: `npm run build`
Expected: SUCCESS with zero compilation errors.

- [ ] **Step 3: Verification of live behavior**

Verify room creation, player joining, voting, 3D flip on reveal, distribution chart display, spectator mode switching, and revote.

- [ ] **Step 4: Commit final polish**

```bash
git add .
git commit -m "feat(poker): polish planning poker styling to match planningpokeronline"
```

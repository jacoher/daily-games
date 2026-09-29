import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { PokerService, PokerReactionEvent } from '../poker.service';
import { ParticipantService } from '../../participant.service';
import { SoundService } from '../../sound.service';
import {
  FIBONACCI_CARDS,
  PokerDeckType,
  PokerPlayer,
  PokerStats,
  PokerStory,
  TSHIRT_CARDS
} from '../poker.types';

interface FloatingReaction {
  id: number;
  emoji: string;
  playerName: string;
  leftPercent: number;
}

@Component({
  selector: 'app-poker-host',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './poker-host.component.html',
  styleUrls: ['./poker-host.component.css']
})
export class PokerHostComponent implements OnInit, OnDestroy {
  roomId = '';
  deckType: PokerDeckType = 'fibonacci';
  stories: PokerStory[] = [
    { id: '1', title: 'Historia 1: Integración y flujo principal' }
  ];
  currentStoryIndex = 0;
  revealed = false;
  players: PokerPlayer[] = [];
  stats: PokerStats = {
    average: null,
    median: null,
    mode: null,
    isConsensus: false,
    consensusValue: null,
    hasExtremeDuel: false,
    duelists: null,
    distribution: []
  };

  // QR & Joining
  qrDataUrl = '';
  joinUrl = '';
  customIp = '';
  showQrModal = false;
  copied = false;

  // New story input
  newStoryTitle = '';

  // Floating reactions
  floatingReactions: FloatingReaction[] = [];
  private reactionCounter = 0;

  // Tie-breaker Roulette state
  showRouletteModal = false;
  rouletteItems: string[] = [];
  rouletteWinner: string | null = null;
  isRouletteSpinning = false;
  rouletteRotation = 0;

  // Extreme duel countdown
  duelCountdown: number = 60;
  duelInterval: any = null;

  private subs: Subscription[] = [];

  constructor(
    public pokerService: PokerService,
    private participantService: ParticipantService,
    private soundService: SoundService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get currentStory(): PokerStory | undefined {
    return this.stories[this.currentStoryIndex];
  }

  get votedCount(): number {
    return this.players.filter(p => p.hasVoted).length;
  }

  get deckCards(): string[] {
    return this.deckType === 'fibonacci' ? FIBONACCI_CARDS : TSHIRT_CARDS;
  }

  async ngOnInit() {
    this.participantService.loadParticipants();
    const participants = this.participantService.participants.map(p => ({
      name: p.name,
      avatarUrl: p.avatarUrl
    }));

    if (this.isLocalHost()) {
      this.detectLocalIP().then(ip => {
        if (ip && ip !== this.customIp) {
          this.customIp = ip;
          if (this.roomId) {
            this.buildQR(this.roomId);
          }
        }
      });
    }

    this.subs.push(
      this.pokerService.roomId$.subscribe(id => {
        this.roomId = id;
        if (id) this.buildQR(id);
        this.cdr.markForCheck();
      }),
      this.pokerService.deckType$.subscribe(d => {
        this.deckType = d;
        this.cdr.markForCheck();
      }),
      this.pokerService.stories$.subscribe(s => {
        if (s && s.length > 0) this.stories = s;
        this.cdr.markForCheck();
      }),
      this.pokerService.currentStoryIndex$.subscribe(idx => {
        this.currentStoryIndex = idx;
        this.cdr.markForCheck();
      }),
      this.pokerService.revealed$.subscribe(rev => {
        const prev = this.revealed;
        this.revealed = rev;
        if (!prev && rev) {
          this.onRevealEffects();
        } else if (!rev) {
          this.clearDuelTimer();
        }
        this.cdr.markForCheck();
      }),
      this.pokerService.players$.subscribe(p => {
        this.players = p;
        this.cdr.markForCheck();
      }),
      this.pokerService.stats$.subscribe(s => {
        this.stats = s;
        this.cdr.markForCheck();
      }),
      this.pokerService.reactions$.subscribe(reaction => {
        this.triggerFloatingReaction(reaction);
      })
    );

    // Create room initially if not created
    if (!this.pokerService.roomId$.value) {
      try {
        await this.pokerService.createRoom(this.deckType, participants, this.stories);
      } catch (e) {
        console.error('Error creating poker room:', e);
      }
    }
  }

  ngOnDestroy() {
    this.clearDuelTimer();
    this.subs.forEach(s => s.unsubscribe());
  }

  goBack() {
    this.pokerService.disconnect();
    this.router.navigate(['/']);
  }

  switchDeck(type: PokerDeckType) {
    if (this.deckType === type) return;
    this.deckType = type;
    this.pokerService.selectDeck(type);
    this.soundService.playTick();
  }

  addStory() {
    const title = this.newStoryTitle.trim();
    if (!title) return;
    const newStory: PokerStory = {
      id: String(Date.now()),
      title
    };
    const updated = [...this.stories, newStory];
    this.stories = updated;
    this.newStoryTitle = '';
    this.pokerService.setStories(updated, this.currentStoryIndex);
  }

  selectStory(index: number) {
    if (index === this.currentStoryIndex) return;
    this.currentStoryIndex = index;
    this.pokerService.setStories(this.stories, index);
    this.soundService.playTick();
  }

  deleteStory(index: number, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    const updated = this.stories.filter((_, i) => i !== index);
    let newIndex = this.currentStoryIndex;
    if (index === this.currentStoryIndex) {
      newIndex = Math.max(0, Math.min(index, updated.length - 1));
    } else if (index < this.currentStoryIndex) {
      newIndex = Math.max(0, this.currentStoryIndex - 1);
    }
    this.stories = updated;
    this.currentStoryIndex = newIndex;
    this.pokerService.setStories(updated, newIndex);
    this.soundService.playTick();
  }

  revealCards() {
    this.soundService.playTick();
    this.pokerService.reveal();
  }

  resetRound() {
    this.clearDuelTimer();
    this.soundService.playTick();
    this.pokerService.reset();
  }

  settleCurrentStory(val: string) {
    if (!this.currentStory) return;
    this.currentStory.estimate = val;
    this.pokerService.settleEstimate(val);
    this.soundService.playWinnerSound();

    // If there is a next story, advance to it
    if (this.currentStoryIndex < this.stories.length - 1) {
      setTimeout(() => {
        this.selectStory(this.currentStoryIndex + 1);
      }, 800);
    }
  }

  // --- Fun Dynamics ---

  private onRevealEffects() {
    this.soundService.playTick();

    // 1. Consensus Party
    if (this.stats.isConsensus && this.stats.consensusValue) {
      this.soundService.playWinnerSound();
      this.fireConfetti();
      this.settleCurrentStory(this.stats.consensusValue);
    }

    // 2. Extreme Duel
    if (this.stats.hasExtremeDuel && this.stats.duelists) {
      this.startDuelTimer();
    }
  }

  private fireConfetti() {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 250);
  }

  private startDuelTimer() {
    this.clearDuelTimer();
    this.duelCountdown = 60;
    this.duelInterval = setInterval(() => {
      if (this.duelCountdown > 0) {
        this.duelCountdown--;
        this.cdr.markForCheck();
      } else {
        this.clearDuelTimer();
      }
    }, 1000);
  }

  private clearDuelTimer() {
    if (this.duelInterval) {
      clearInterval(this.duelInterval);
      this.duelInterval = null;
    }
  }

  // 3. Floating Reactions
  private triggerFloatingReaction(reaction: PokerReactionEvent) {
    const item: FloatingReaction = {
      id: ++this.reactionCounter,
      emoji: reaction.emoji,
      playerName: reaction.playerName,
      leftPercent: 10 + Math.random() * 80
    };
    this.floatingReactions.push(item);
    this.cdr.markForCheck();

    setTimeout(() => {
      this.floatingReactions = this.floatingReactions.filter(r => r.id !== item.id);
      this.cdr.markForCheck();
    }, 2500);
  }

  // 4. Tie-breaker Roulette
  openRouletteModal() {
    // Pick disputed values from current votes
    const validVotes = this.players
      .filter(p => p.vote && p.vote !== '?' && p.vote !== '☕' && p.vote !== 'hidden')
      .map(p => p.vote as string);

    const uniqueVotes = Array.from(new Set(validVotes));
    this.rouletteItems = uniqueVotes.length >= 2 ? uniqueVotes : (this.deckType === 'fibonacci' ? ['3', '5', '8'] : ['S', 'M', 'L']);
    this.rouletteWinner = null;
    this.isRouletteSpinning = false;
    this.showRouletteModal = true;
  }

  closeRouletteModal() {
    if (this.isRouletteSpinning) return;
    this.showRouletteModal = false;
  }

  spinRoulette() {
    if (this.isRouletteSpinning || this.rouletteItems.length === 0) return;
    this.isRouletteSpinning = true;
    this.rouletteWinner = null;

    const winnerIdx = Math.floor(Math.random() * this.rouletteItems.length);
    const chosen = this.rouletteItems[winnerIdx];
    const segmentAngle = 360 / this.rouletteItems.length;
    const extraSpins = 5 * 360;
    const targetAngle = extraSpins + (360 - (winnerIdx * segmentAngle + segmentAngle / 2));

    this.rouletteRotation += targetAngle;
    this.soundService.playSpinningSound(3000);

    setTimeout(() => {
      this.rouletteWinner = chosen;
      this.isRouletteSpinning = false;
      this.soundService.playWinnerSound();
      this.cdr.markForCheck();
    }, 3200);
  }

  applyRouletteWinner() {
    if (!this.rouletteWinner) return;
    this.settleCurrentStory(this.rouletteWinner);
    this.closeRouletteModal();
  }

  isLocalHost(): boolean {
    const hostname = window.location.hostname || 'localhost';
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local')
    );
  }

  detectLocalIP(): Promise<string> {
    return new Promise(resolve => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        (pc as any).createDataChannel('');
        pc.createOffer().then(o => pc.setLocalDescription(o));
        const t = setTimeout(() => {
          pc.close();
          resolve(window.location.hostname);
        }, 3000);
        pc.onicecandidate = e => {
          if (!e.candidate) return;
          const m = e.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (m && !m[1].startsWith('127.')) {
            clearTimeout(t);
            pc.close();
            resolve(m[1]);
          }
        };
      } catch {
        resolve(window.location.hostname);
      }
    });
  }

  async onIpChange() {
    if (this.roomId) {
      await this.buildQR(this.roomId);
    }
  }

  // --- QR & Copy Link ---
  private async buildQR(roomId: string) {
    let url = '';
    const hostname = window.location.hostname;

    if (hostname.includes('github.io') || hostname.includes('jacoher.github.io')) {
      url = `https://jacoher.github.io/daily-games/poker/play?room=${roomId}`;
    } else if (this.isLocalHost()) {
      const port = window.location.port ? `:${window.location.port}` : ':4200';
      const host = this.customIp || hostname || 'localhost';
      url = `http://${host}${port}/poker/play?room=${roomId}`;
    } else {
      const portStr = window.location.port ? `:${window.location.port}` : '';
      const protocol = window.location.protocol || 'https:';
      const host = this.customIp && this.customIp !== hostname ? this.customIp : hostname;
      url = `${protocol}//${host}${portStr}/poker/play?room=${roomId}`;
    }

    this.joinUrl = url;

    try {
      this.qrDataUrl = await QRCode.toDataURL(this.joinUrl, {
        width: 240,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Error generating QR:', err);
    }
  }

  copyLink() {
    navigator.clipboard.writeText(this.joinUrl).then(() => {
      this.copied = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.copied = false;
        this.cdr.markForCheck();
      }, 2000);
    });
  }
}

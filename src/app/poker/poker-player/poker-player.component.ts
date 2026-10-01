import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PokerService, PokerReactionEvent } from '../poker.service';
import { FIBONACCI_CARDS, PokerDeckType, PokerPlayer, PokerStats, PokerStory, TSHIRT_CARDS } from '../poker.types';
import { SoundService } from '../../sound.service';

@Component({
  selector: 'app-poker-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './poker-player.component.html',
  styleUrls: ['./poker-player.component.css']
})
export class PokerPlayerComponent implements OnInit, OnDestroy {
  roomId = '';
  deckType: PokerDeckType = 'fibonacci';
  stories: PokerStory[] = [];
  currentStoryIndex = 0;
  revealed = false;
  players: PokerPlayer[] = [];
  myVote: string | null = null;
  isSpectator = false;
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

  // Join state
  joined = false;
  joining = false;
  loadingRoom = false;
  myName = '';
  myAvatar = '';
  selectedAvatar = '';
  customNameInput = '';
  errorMsg = '';

  availableParticipants: Array<{ name: string; avatarUrl?: string; avatar?: string }> = [];

  // Reaction buttons
  quickReactions = ['🔥', '💩', '☕', '🤯', '🚀', '💯'];
  recentReaction: string | null = null;

  private subs: Subscription[] = [];

  constructor(
    public pokerService: PokerService,
    private soundService: SoundService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get currentStory(): PokerStory | undefined {
    return this.stories[this.currentStoryIndex];
  }

  get activeVoters(): PokerPlayer[] {
    return this.players.filter(p => !p.isSpectator);
  }

  get spectators(): PokerPlayer[] {
    return this.players.filter(p => p.isSpectator);
  }

  get votedCount(): number {
    return this.activeVoters.filter(p => p.hasVoted).length;
  }

  get totalEligibleCount(): number {
    return this.activeVoters.length;
  }

  get votingProgressPercent(): number {
    if (this.totalEligibleCount === 0) return 0;
    return Math.round((this.votedCount / this.totalEligibleCount) * 100);
  }

  get deckCards(): string[] {
    return this.deckType === 'fibonacci' ? FIBONACCI_CARDS : TSHIRT_CARDS;
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.roomId = (params['room'] || '').trim().toUpperCase();
      this.cdr.markForCheck();
      if (this.roomId) {
        this.loadRoomInfo(this.roomId);
      }
    });

    this.subs.push(
      this.pokerService.deckType$.subscribe(d => {
        this.deckType = d;
        this.cdr.markForCheck();
      }),
      this.pokerService.stories$.subscribe(s => {
        this.stories = s;
        this.cdr.markForCheck();
      }),
      this.pokerService.currentStoryIndex$.subscribe(idx => {
        this.currentStoryIndex = idx;
        this.cdr.markForCheck();
      }),
      this.pokerService.revealed$.subscribe(rev => {
        this.revealed = rev;
        this.cdr.markForCheck();
      }),
      this.pokerService.players$.subscribe(p => {
        this.players = p;
        this.cdr.markForCheck();
      }),
      this.pokerService.myVote$.subscribe(v => {
        this.myVote = v;
        this.cdr.markForCheck();
      }),
      this.pokerService.isSpectator$.subscribe(spec => {
        this.isSpectator = spec;
        this.cdr.markForCheck();
      }),
      this.pokerService.stats$.subscribe(st => {
        this.stats = st;
        this.cdr.markForCheck();
      }),
      this.pokerService.errorMsg$.subscribe(err => {
        this.errorMsg = err;
        this.cdr.markForCheck();
      })
    );

    // If already joined previously in session for the same room
    const savedName = sessionStorage.getItem('poker_player_name');
    const savedAvatar = sessionStorage.getItem('poker_player_avatar');
    const savedRoom = sessionStorage.getItem('poker_player_room');
    if (savedName && this.roomId && savedRoom === this.roomId) {
      this.myName = savedName;
      this.myAvatar = savedAvatar || '';
      this.attemptJoin(savedName, this.myAvatar);
    }
  }

  async loadRoomInfo(roomId: string) {
    if (!roomId) return;
    this.loadingRoom = true;
    try {
      await this.pokerService.getRoomInfo(roomId);
      this.availableParticipants = this.pokerService.availableParticipants;
    } catch (err: any) {
      this.errorMsg = err.message || 'Error al obtener información de la sala';
    } finally {
      this.loadingRoom = false;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  goBack() {
    this.pokerService.disconnect();
    sessionStorage.removeItem('poker_player_name');
    sessionStorage.removeItem('poker_player_avatar');
    sessionStorage.removeItem('poker_player_room');
    this.router.navigate(['/']);
  }

  getAvatar(p: { name: string; avatarUrl?: string; avatar?: string }): string {
    return p.avatarUrl || p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}`;
  }

  onAvatarError(event: any, p: { name: string }) {
    event.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}`;
  }

  onSelfImgErr(event: any) {
    if (this.myName) {
      event.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(this.myName)}`;
    }
  }

  async selectPredefined(p: { name: string; avatarUrl?: string; avatar?: string }) {
    const avatar = this.getAvatar(p);
    await this.attemptJoin(p.name, avatar);
  }

  chooseAvatar(avatar: string) {
    this.selectedAvatar = avatar;
    this.cdr.markForCheck();
  }

  async joinWithCustomName() {
    const name = this.customNameInput.trim();
    if (!name) return;
    const avatar = this.selectedAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
    await this.attemptJoin(name, avatar);
  }

  private async attemptJoin(name: string, avatar: string) {
    if (!this.roomId) {
      this.errorMsg = 'No se especificó código de sala en la URL';
      return;
    }

    this.joining = true;
    this.errorMsg = '';
    try {
      await this.pokerService.joinRoom(this.roomId, name, avatar);
      this.myName = name;
      this.myAvatar = avatar;
      this.joined = true;
      sessionStorage.setItem('poker_player_name', name);
      sessionStorage.setItem('poker_player_avatar', avatar);
      sessionStorage.setItem('poker_player_room', this.roomId);
      this.soundService.playTick();
    } catch (err: any) {
      this.errorMsg = err.message || 'Error al conectar con la sala';
    } finally {
      this.joining = false;
      this.cdr.markForCheck();
    }
  }

  castVote(card: string) {
    if (this.revealed || this.isSpectator) return;
    this.soundService.playTick();
    if (this.myVote === card) {
      // Toggle unvote
      this.pokerService.vote('');
      this.myVote = null;
    } else {
      this.pokerService.vote(card);
    }
  }

  toggleSpectatorMode() {
    const next = !this.isSpectator;
    this.soundService.playTick();
    this.pokerService.toggleSpectator(next);
  }

  resetRound() {
    this.soundService.playTick();
    this.pokerService.reset();
  }

  sendReaction(emoji: string) {
    this.recentReaction = emoji;
    this.soundService.playTick();
    this.pokerService.sendReaction(emoji);
    setTimeout(() => {
      if (this.recentReaction === emoji) this.recentReaction = null;
      this.cdr.markForCheck();
    }, 1000);
  }

  isParticipantTaken(name: string): boolean {
    return this.players.some(p => p.name.toLowerCase() === name.toLowerCase() && p.connected);
  }
}

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PokerService, PokerReactionEvent } from '../poker.service';
import { FIBONACCI_CARDS, PokerDeckType, PokerPlayer, PokerStory, TSHIRT_CARDS } from '../poker.types';
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

  // Join state
  joined = false;
  joining = false;
  myName = '';
  myAvatar = '';
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

  get deckCards(): string[] {
    return this.deckType === 'fibonacci' ? FIBONACCI_CARDS : TSHIRT_CARDS;
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.roomId = (params['room'] || '').trim().toUpperCase();
      this.cdr.markForCheck();
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
      this.pokerService.errorMsg$.subscribe(err => {
        this.errorMsg = err;
        this.cdr.markForCheck();
      })
    );

    // If already joined previously in session
    const savedName = sessionStorage.getItem('poker_player_name');
    const savedAvatar = sessionStorage.getItem('poker_player_avatar');
    if (savedName && this.roomId) {
      this.myName = savedName;
      this.myAvatar = savedAvatar || '';
      this.attemptJoin(savedName, this.myAvatar);
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  goBack() {
    this.pokerService.disconnect();
    this.router.navigate(['/']);
  }

  async selectPredefined(p: { name: string; avatarUrl?: string; avatar?: string }) {
    const avatar = p.avatarUrl || p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name)}`;
    await this.attemptJoin(p.name, avatar);
  }

  async joinWithCustomName() {
    const name = this.customNameInput.trim();
    if (!name) return;
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
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
      this.soundService.playTick();
    } catch (err: any) {
      this.errorMsg = err.message || 'Error al conectar con la sala';
    } finally {
      this.joining = false;
      this.cdr.markForCheck();
    }
  }

  castVote(card: string) {
    if (this.revealed) return;
    this.soundService.playTick();
    this.pokerService.vote(card);
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

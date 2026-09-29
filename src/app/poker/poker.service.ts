import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { calculatePokerStats } from './poker-stats.util';
import {
  PokerDeckType,
  PokerPlayer,
  PokerRoomData,
  PokerStats,
  PokerStory
} from './poker.types';

export interface PokerReactionEvent {
  emoji: string;
  playerName: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class PokerService {
  private socket: Socket | null = null;

  // ---- State Observables ----
  roomId$ = new BehaviorSubject<string>('');
  deckType$ = new BehaviorSubject<PokerDeckType>('fibonacci');
  stories$ = new BehaviorSubject<PokerStory[]>([]);
  currentStoryIndex$ = new BehaviorSubject<number>(0);
  revealed$ = new BehaviorSubject<boolean>(false);
  players$ = new BehaviorSubject<PokerPlayer[]>([]);
  stats$ = new BehaviorSubject<PokerStats>({
    average: null,
    median: null,
    mode: null,
    isConsensus: false,
    consensusValue: null,
    hasExtremeDuel: false,
    duelists: null,
    distribution: []
  });
  myVote$ = new BehaviorSubject<string | null>(null);
  reactions$ = new Subject<PokerReactionEvent>();
  errorMsg$ = new BehaviorSubject<string>('');
  isConnected$ = new BehaviorSubject<boolean>(false);

  isHost = false;
  myName = '';
  myAvatar = '';
  availableParticipants: Array<{ name: string; avatarUrl?: string; avatar?: string }> = [];

  constructor(private zone: NgZone) {}

  private getServerUrl(): string {
    const customUrl = localStorage.getItem('trivia_server_url') || localStorage.getItem('poker_server_url');
    if (customUrl) return customUrl.trim().replace(/\/$/, '');

    const hostname = window.location.hostname || 'localhost';
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local');

    if (isLocal) {
      return `http://${hostname}:3001`;
    }
    return 'https://ruleta-trivia-backend.onrender.com';
  }

  private initSocket(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }
    if (this.socket) {
      this.socket.disconnect();
    }

    const serverUrl = this.getServerUrl();
    this.socket = io(serverUrl, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      this.zone.run(() => {
        this.isConnected$.next(true);
        this.errorMsg$.next('');
      });
    });

    this.socket.on('connect_error', (err) => {
      this.zone.run(() => {
        this.isConnected$.next(false);
        this.errorMsg$.next('Error al conectar con el servidor: ' + err.message);
      });
    });

    this.socket.on('disconnect', () => {
      this.zone.run(() => {
        this.isConnected$.next(false);
      });
    });

    // Poker Room events
    this.socket.on('poker:players-update', (players: PokerPlayer[]) => {
      this.zone.run(() => {
        this.players$.next(players);
        this.updateStats();
      });
    });

    this.socket.on('poker:revealed', (data: { players: PokerPlayer[]; currentStory: PokerStory }) => {
      this.zone.run(() => {
        this.revealed$.next(true);
        this.players$.next(data.players);
        this.updateStats();
      });
    });

    this.socket.on('poker:round-reset', (data: { players: PokerPlayer[]; currentStory: PokerStory }) => {
      this.zone.run(() => {
        this.revealed$.next(false);
        this.myVote$.next(null);
        this.players$.next(data.players);
        this.updateStats();
      });
    });

    this.socket.on('poker:deck-updated', (data: { deckType: PokerDeckType; players: PokerPlayer[] }) => {
      this.zone.run(() => {
        this.deckType$.next(data.deckType);
        this.revealed$.next(false);
        this.myVote$.next(null);
        this.players$.next(data.players);
        this.updateStats();
      });
    });

    this.socket.on('poker:stories-updated', (data: { stories: PokerStory[]; currentStoryIndex: number; players: PokerPlayer[] }) => {
      this.zone.run(() => {
        this.stories$.next(data.stories);
        this.currentStoryIndex$.next(data.currentStoryIndex);
        this.revealed$.next(false);
        this.myVote$.next(null);
        this.players$.next(data.players);
        this.updateStats();
      });
    });

    this.socket.on('poker:estimate-settled', (data: { story: PokerStory; stories: PokerStory[] }) => {
      this.zone.run(() => {
        this.stories$.next(data.stories);
      });
    });

    this.socket.on('poker:reaction', (reaction: PokerReactionEvent) => {
      this.zone.run(() => {
        this.reactions$.next(reaction);
      });
    });

    this.socket.on('poker:room-closed', (data: { message: string }) => {
      this.zone.run(() => {
        this.errorMsg$.next(data.message || 'La sala fue cerrada');
      });
    });

    return this.socket;
  }

  createRoom(deckType: PokerDeckType, participants: any[], stories: PokerStory[]): Promise<string> {
    const s = this.initSocket();
    this.isHost = true;
    return new Promise((resolve, reject) => {
      s.emit('poker:create-room', { deckType, participants, stories }, (res: any) => {
        this.zone.run(() => {
          if (res?.success) {
            this.roomId$.next(res.roomId);
            this.deckType$.next(deckType);
            this.stories$.next(res.room.stories);
            this.currentStoryIndex$.next(res.room.currentStoryIndex);
            this.availableParticipants = participants;
            resolve(res.roomId);
          } else {
            reject(new Error(res?.message || 'No se pudo crear la sala'));
          }
        });
      });
    });
  }

  getRoomInfo(roomId: string): Promise<any> {
    const s = this.initSocket();
    const cleanId = (roomId || '').trim().toUpperCase();

    return new Promise((resolve, reject) => {
      s.emit('poker:get-info', { roomId: cleanId }, (res: any) => {
        this.zone.run(() => {
          if (res?.success) {
            this.roomId$.next(res.roomId);
            if (res.deckType) this.deckType$.next(res.deckType);
            if (res.stories) this.stories$.next(res.stories);
            if (typeof res.currentStoryIndex === 'number') this.currentStoryIndex$.next(res.currentStoryIndex);
            if (res.participants) this.availableParticipants = res.participants;
            if (res.players) {
              this.players$.next(res.players);
              this.updateStats();
            }
            resolve(res);
          } else {
            this.errorMsg$.next(res?.message || 'Sala no encontrada');
            reject(new Error(res?.message || 'Sala no encontrada'));
          }
        });
      });
    });
  }

  joinRoom(roomId: string, name: string, avatar?: string): Promise<boolean> {
    const s = this.initSocket();
    this.isHost = false;
    this.myName = name;
    this.myAvatar = avatar || '';

    return new Promise((resolve, reject) => {
      s.emit('poker:join-room', { roomId, name, avatar }, (res: any) => {
        this.zone.run(() => {
          if (res?.success) {
            this.roomId$.next(res.roomId);
            const r: PokerRoomData = res.room;
            this.deckType$.next(r.deckType);
            this.stories$.next(r.stories);
            this.currentStoryIndex$.next(r.currentStoryIndex);
            this.revealed$.next(r.revealed);
            this.players$.next(r.players);
            if (r.availableParticipants) {
              this.availableParticipants = r.availableParticipants;
            }
            if (res.player?.vote) {
              this.myVote$.next(res.player.vote);
            }
            this.updateStats();
            resolve(true);
          } else {
            this.errorMsg$.next(res?.message || 'Error al unirse a la sala');
            reject(new Error(res?.message || 'Error al unirse a la sala'));
          }
        });
      });
    });
  }

  vote(card: string): void {
    if (!this.socket || !this.roomId$.value) return;
    this.myVote$.next(card);
    this.socket.emit('poker:vote', { roomId: this.roomId$.value, vote: card });
  }

  reveal(): void {
    if (!this.socket || !this.roomId$.value || !this.isHost) return;
    this.socket.emit('poker:reveal', { roomId: this.roomId$.value });
  }

  reset(): void {
    if (!this.socket || !this.roomId$.value || !this.isHost) return;
    this.socket.emit('poker:reset', { roomId: this.roomId$.value });
  }

  selectDeck(deckType: PokerDeckType): void {
    if (!this.socket || !this.roomId$.value || !this.isHost) return;
    this.socket.emit('poker:select-deck', { roomId: this.roomId$.value, deckType });
  }

  setStories(stories: PokerStory[], currentStoryIndex: number = 0): void {
    if (!this.socket || !this.roomId$.value || !this.isHost) return;
    this.socket.emit('poker:set-stories', { roomId: this.roomId$.value, stories, currentStoryIndex });
  }

  settleEstimate(estimate: string): void {
    if (!this.socket || !this.roomId$.value || !this.isHost) return;
    this.socket.emit('poker:settle-estimate', { roomId: this.roomId$.value, estimate });
  }

  sendReaction(emoji: string): void {
    if (!this.socket || !this.roomId$.value) return;
    this.socket.emit('poker:reaction', {
      roomId: this.roomId$.value,
      emoji,
      playerName: this.myName || 'Anónimo'
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private updateStats(): void {
    const revealed = this.revealed$.value;
    if (!revealed) {
      this.stats$.next({
        average: null,
        median: null,
        mode: null,
        isConsensus: false,
        consensusValue: null,
        hasExtremeDuel: false,
        duelists: null,
        distribution: []
      });
      return;
    }

    const currentPlayers = this.players$.value;
    const votes = currentPlayers
      .filter(p => p.vote && p.vote !== 'hidden')
      .map(p => ({ name: p.name, vote: p.vote as string, isSpectator: p.isSpectator }));

    const stats = calculatePokerStats(votes, this.deckType$.value);
    this.stats$.next(stats);
  }
}

import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { TRIVIA_QUESTIONS, TRIVIA_CATEGORIES } from './trivia-data';

export type GamePhase = 'setup' | 'lobby' | 'question' | 'reveal' | 'finished' | 'error';

export interface TriviaPlayer {
  socketId?: string;
  peerId?: string;
  name: string;
  avatar: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  answers?: { questionIndex: number; answerId: string; correct: boolean }[];
}

export interface TriviaQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctId?: string;
  category: string;
  explanation?: string;
}

export interface RoundWinner {
  name: string;
  avatar: string;
  elapsedMs: number;
  seconds: string;
  pointsGained: number;
}

export interface RevealData {
  correctId: string;
  explanation: string;
  answers: { [playerName: string]: string };
  roundWinner?: RoundWinner | null;
}

@Injectable({ providedIn: 'root' })
export class TriviaService {
  private socket: Socket | null = null;

  // ---- Observable state ----
  phase$ = new BehaviorSubject<GamePhase>('setup');
  players$ = new BehaviorSubject<TriviaPlayer[]>([]);
  currentQuestion$ = new BehaviorSubject<TriviaQuestion | null>(null);
  questionIndex$ = new BehaviorSubject<number>(0);
  totalQuestions$ = new BehaviorSubject<number>(0);
  secondsLeft$ = new BehaviorSubject<number>(0);
  currentAnswers$ = new BehaviorSubject<{ [name: string]: string }>({});
  revealData$ = new BehaviorSubject<RevealData | null>(null);
  roundWinner$ = new BehaviorSubject<RoundWinner | null>(null);
  rankings$ = new BehaviorSubject<TriviaPlayer[]>([]);
  errorMsg$ = new BehaviorSubject<string>('');
  answeredCount$ = new BehaviorSubject<number>(0);

  /** Raw messages */
  message$ = new Subject<any>();

  isHost = false;
  roomId = '';
  myName = '';
  myAvatar = '';
  availableParticipants: { name: string; avatar: string }[] = [];

  private questions: TriviaQuestion[] = [];
  timeLimit = 20;

  constructor(private zone: NgZone) {}

  private getServerUrl(): string {
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:3001`;
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
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    });

    this.socket.on('connect_error', (err) => {
      this.zone.run(() => {
        this.errorMsg$.next('Error al conectar con el servidor: ' + err.message);
      });
    });

    return this.socket;
  }

  // ─────────────────────────────────────────────────────────────────
  // QUESTIONS & CATEGORIES
  // ─────────────────────────────────────────────────────────────────
  loadQuestions(category: string, count: number): TriviaQuestion[] {
    let pool: TriviaQuestion[] = [];

    if (category === 'Mixto') {
      for (const cat of Object.keys(TRIVIA_QUESTIONS)) {
        pool.push(...TRIVIA_QUESTIONS[cat]);
      }
    } else {
      pool = [...(TRIVIA_QUESTIONS[category] || [])];
    }

    this.questions = this.shuffle(pool).slice(0, Math.min(count, pool.length));
    this.totalQuestions$.next(this.questions.length);
    return this.questions;
  }

  get categories(): string[] {
    return TRIVIA_CATEGORIES;
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ─────────────────────────────────────────────────────────────────
  // HOST – create a Socket room
  // ─────────────────────────────────────────────────────────────────
  createRoom(participants: { name: string; avatar: string }[], category: string = 'Mixto', count: number = 5): Promise<string> {
    this.availableParticipants = participants;
    this.isHost = true;
    const socket = this.initSocket();

    const selectedQuestions = this.loadQuestions(category, count);

    return new Promise((resolve, reject) => {
      socket.emit('host:create-room', {
        category,
        timeLimit: this.timeLimit,
        questionCount: selectedQuestions.length,
        questions: selectedQuestions,
        participants
      }, (res: any) => {
        this.zone.run(() => {
          if (res && res.success) {
            this.roomId = res.roomId;
            this.phase$.next('lobby');
            this.setupHostListeners();
            resolve(res.roomId);
          } else {
            this.errorMsg$.next(res?.error || 'No se pudo crear la sala');
            this.phase$.next('error');
            reject(new Error(res?.error || 'Error al crear sala'));
          }
        });
      });
    });
  }

  private setupHostListeners() {
    if (!this.socket) return;

    this.socket.on('room:players-update', (players: TriviaPlayer[]) => {
      this.zone.run(() => {
        this.players$.next(players);
      });
    });

    this.socket.on('room:player-answered', (data: { playerName: string; totalAnswered: number; totalPlayers: number }) => {
      this.zone.run(() => {
        this.answeredCount$.next(data.totalAnswered);
        const cur = { ...this.currentAnswers$.value };
        cur[data.playerName] = 'answered';
        this.currentAnswers$.next(cur);
      });
    });

    this.socket.on('room:question-started', (data: any) => {
      this.zone.run(() => {
        this.currentQuestion$.next(data);
        this.questionIndex$.next(data.index);
        this.totalQuestions$.next(data.total);
        this.secondsLeft$.next(data.timeLimit);
        this.currentAnswers$.next({});
        this.revealData$.next(null);
        this.roundWinner$.next(null);
        this.answeredCount$.next(0);
        this.phase$.next('question');
      });
    });

    this.socket.on('room:timer', (data: { secondsLeft: number }) => {
      this.zone.run(() => {
        this.secondsLeft$.next(data.secondsLeft);
      });
    });

    this.socket.on('room:round-ended', (data: any) => {
      this.zone.run(() => {
        this.revealData$.next({
          correctId: data.correctId,
          explanation: data.explanation,
          answers: data.answers,
          roundWinner: data.roundWinner
        });
        this.roundWinner$.next(data.roundWinner || null);
        this.players$.next(data.players || []);
        this.phase$.next('reveal');
      });
    });

    this.socket.on('room:game-over', (data: { rankings: TriviaPlayer[] }) => {
      this.zone.run(() => {
        this.rankings$.next(data.rankings);
        this.phase$.next('finished');
      });
    });
  }

  startGame() {
    if (this.socket && this.roomId) {
      this.socket.emit('host:start-game', { roomId: this.roomId });
    }
  }

  revealQuestion() {
    if (this.socket && this.roomId) {
      this.socket.emit('host:reveal', { roomId: this.roomId });
    }
  }

  nextQuestion() {
    if (this.socket && this.roomId) {
      this.socket.emit('host:next-question', { roomId: this.roomId });
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PLAYER – join room
  // ─────────────────────────────────────────────────────────────────
  joinRoom(roomId: string): Promise<void> {
    this.roomId = roomId.trim().toUpperCase();
    this.isHost = false;
    const socket = this.initSocket();

    return new Promise((resolve, reject) => {
      this.setupPlayerListeners();
      socket.emit('room:get-info', { roomId: this.roomId }, (res: any) => {
        this.zone.run(() => {
          if (res && res.success) {
            this.availableParticipants = res.participants || [];
            this.players$.next(res.players || []);
            this.phase$.next('lobby');
            this.message$.next({ type: 'room-info', participants: res.participants });
            resolve();
          } else {
            this.errorMsg$.next(res?.error || 'Sala no encontrada');
            this.phase$.next('error');
            reject(new Error(res?.error || 'Sala no encontrada'));
          }
        });
      });
    });
  }

  sendJoin() {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('player:join', {
      roomId: this.roomId,
      name: this.myName,
      avatar: this.myAvatar
    }, (res: any) => {
      this.zone.run(() => {
        if (!res || !res.success) {
          this.errorMsg$.next(res?.error || 'Error al unirse');
          this.phase$.next('error');
        } else {
          this.phase$.next(res.currentPhase === 'question' ? 'question' : 'lobby');
        }
      });
    });
  }

  submitAnswer(answerId: string) {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('player:submit-answer', {
      roomId: this.roomId,
      answerId
    });
  }

  private setupPlayerListeners() {
    if (!this.socket) return;

    this.socket.on('room:players-update', (players: TriviaPlayer[]) => {
      this.zone.run(() => {
        this.players$.next(players);
      });
    });

    this.socket.on('room:question-started', (data: any) => {
      this.zone.run(() => {
        this.currentQuestion$.next(data);
        this.questionIndex$.next(data.index);
        this.totalQuestions$.next(data.total);
        this.secondsLeft$.next(data.timeLimit);
        this.currentAnswers$.next({});
        this.revealData$.next(null);
        this.roundWinner$.next(null);
        this.phase$.next('question');
      });
    });

    this.socket.on('room:timer', (data: { secondsLeft: number }) => {
      this.zone.run(() => {
        this.secondsLeft$.next(data.secondsLeft);
      });
    });

    this.socket.on('room:round-ended', (data: any) => {
      this.zone.run(() => {
        this.revealData$.next({
          correctId: data.correctId,
          explanation: data.explanation,
          answers: data.answers,
          roundWinner: data.roundWinner
        });
        this.roundWinner$.next(data.roundWinner || null);
        this.players$.next(data.players || []);
        this.phase$.next('reveal');
      });
    });

    this.socket.on('room:game-over', (data: { rankings: TriviaPlayer[] }) => {
      this.zone.run(() => {
        this.rankings$.next(data.rankings);
        this.phase$.next('finished');
      });
    });

    this.socket.on('room:closed', (data: { message: string }) => {
      this.zone.run(() => {
        this.errorMsg$.next(data.message || 'La sala fue cerrada');
        this.phase$.next('error');
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Utils
  // ─────────────────────────────────────────────────────────────────
  getLocalIP(): Promise<string> {
    return new Promise(resolve => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        (pc as any).createDataChannel('');
        pc.createOffer().then(o => pc.setLocalDescription(o));
        const t = setTimeout(() => { pc.close(); resolve(window.location.hostname); }, 3000);
        pc.onicecandidate = e => {
          if (!e.candidate) return;
          const m = e.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (m && !m[1].startsWith('127.')) { clearTimeout(t); pc.close(); resolve(m[1]); }
        };
      } catch { resolve(window.location.hostname); }
    });
  }

  reset() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.questions = [];
    this.isHost = false;
    this.roomId = '';
    this.myName = '';
    this.myAvatar = '';
    this.phase$.next('setup');
    this.players$.next([]);
    this.currentQuestion$.next(null);
    this.currentAnswers$.next({});
    this.revealData$.next(null);
    this.roundWinner$.next(null);
    this.rankings$.next([]);
    this.errorMsg$.next('');
    this.answeredCount$.next(0);
  }
}

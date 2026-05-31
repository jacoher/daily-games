import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import Peer, { DataConnection } from 'peerjs';
import { TRIVIA_QUESTIONS, TRIVIA_CATEGORIES } from './trivia-data';

export type GamePhase = 'setup' | 'lobby' | 'question' | 'reveal' | 'finished' | 'error';

export interface TriviaPlayer {
  peerId: string;
  name: string;
  avatar: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  answers: { questionIndex: number; answerId: string; correct: boolean }[];
}

export interface TriviaQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctId: string;
  category: string;
  explanation: string;
}

export interface RevealData {
  correctId: string;
  explanation: string;
  answers: { [playerName: string]: string };
}

@Injectable({ providedIn: 'root' })
export class TriviaService {
  private peer: Peer | null = null;
  private connections = new Map<string, DataConnection>();
  private hostConn: DataConnection | null = null;

  // ---- Observable state ----
  phase$ = new BehaviorSubject<GamePhase>('setup');
  players$ = new BehaviorSubject<TriviaPlayer[]>([]);
  currentQuestion$ = new BehaviorSubject<TriviaQuestion | null>(null);
  questionIndex$ = new BehaviorSubject<number>(0);
  totalQuestions$ = new BehaviorSubject<number>(0);
  secondsLeft$ = new BehaviorSubject<number>(0);
  currentAnswers$ = new BehaviorSubject<{ [name: string]: string }>({});
  revealData$ = new BehaviorSubject<RevealData | null>(null);
  rankings$ = new BehaviorSubject<TriviaPlayer[]>([]);
  errorMsg$ = new BehaviorSubject<string>('');

  /** Raw host messages for player component */
  message$ = new Subject<any>();

  isHost = false;
  roomId = '';
  myName = '';
  myAvatar = '';
  availableParticipants: { name: string; avatar: string }[] = [];

  private questions: TriviaQuestion[] = [];
  private timerInterval: any = null;
  timeLimit = 20;

  constructor(private zone: NgZone) {}

  // ─────────────────────────────────────────────────────────────────
  // QUESTIONS – loaded from local TypeScript data (no fetch/JSON needed)
  // ─────────────────────────────────────────────────────────────────
  loadQuestions(category: string, count: number): void {
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
  // HOST – create a PeerJS room
  // ─────────────────────────────────────────────────────────────────
  createRoom(participants: { name: string; avatar: string }[]): Promise<string> {
    this.availableParticipants = participants;
    this.isHost = true;
    const id = this.generateRoomId();
    this.roomId = id;

    this.peer = new Peer(id);

    return new Promise((resolve, reject) => {
      this.peer!.on('open', () => {
        this.zone.run(() => {
          this.phase$.next('lobby');
          resolve(id);
        });
      });

      this.peer!.on('connection', (conn) => {
        this.zone.run(() => this.onPlayerConnected(conn));
      });

      this.peer!.on('error', (err: any) => {
        this.zone.run(() => {
          this.errorMsg$.next('Error PeerJS: ' + err.message);
          this.phase$.next('error');
          reject(err);
        });
      });
    });
  }

  private onPlayerConnected(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      conn.send({
        type: 'room-info',
        participants: this.availableParticipants,
        players: this.players$.value
      });
    });

    conn.on('data', (raw: any) => {
      this.zone.run(() => {
        if (raw.type === 'join') {
          this.handlePlayerJoin(conn.peer, raw.name, raw.avatar);
        } else if (raw.type === 'answer') {
          this.handlePlayerAnswer(conn.peer, raw.answerId);
        }
      });
    });

    conn.on('close', () => {
      this.zone.run(() => this.connections.delete(conn.peer));
    });
  }

  private handlePlayerJoin(peerId: string, name: string, avatar: string) {
    const current = this.players$.value;
    const exists = current.find(p => p.name === name);
    const updated = exists
      ? current.map(p => p.name === name ? { ...p, peerId } : p)
      : [...current, { peerId, name, avatar, score: 0, correctCount: 0, wrongCount: 0, answers: [] }];
    this.players$.next(updated);
    this.broadcast({ type: 'lobby-update', players: updated });
  }

  private handlePlayerAnswer(peerId: string, answerId: string) {
    const player = this.players$.value.find(p => p.peerId === peerId);
    if (!player) return;
    const cur = { ...this.currentAnswers$.value };
    if (cur[player.name]) return;
    cur[player.name] = answerId;
    this.currentAnswers$.next(cur);
  }

  // ─────────────────────────────────────────────────────────────────
  // HOST – game flow
  // ─────────────────────────────────────────────────────────────────
  startGame() {
    this.phase$.next('question');
    this.broadcast({ type: 'game-start' });
    this.dispatchQuestion(0);
  }

  private dispatchQuestion(index: number) {
    const q = this.questions[index];
    this.currentQuestion$.next(q);
    this.questionIndex$.next(index);
    this.currentAnswers$.next({});
    this.revealData$.next(null);
    this.phase$.next('question');

    this.broadcast({
      type: 'question',
      question: { id: q.id, text: q.text, options: q.options, category: q.category },
      index,
      total: this.questions.length,
      timeLimit: this.timeLimit
    });

    this.startTimer(this.timeLimit, () => this.revealQuestion());
  }

  private startTimer(secs: number, onEnd: () => void) {
    clearInterval(this.timerInterval);
    this.secondsLeft$.next(secs);
    this.timerInterval = setInterval(() => {
      this.zone.run(() => {
        const next = this.secondsLeft$.value - 1;
        this.secondsLeft$.next(next);
        this.broadcast({ type: 'timer', secondsLeft: next });
        if (next <= 0) { clearInterval(this.timerInterval); onEnd(); }
      });
    }, 1000);
  }

  revealQuestion() {
    clearInterval(this.timerInterval);
    const q = this.questions[this.questionIndex$.value];
    const answers = this.currentAnswers$.value;

    const updatedPlayers = this.players$.value.map(p => {
      const ans = answers[p.name];
      const correct = ans === q.correctId;
      const timeBonus = correct ? Math.max(0, this.secondsLeft$.value * 5) : 0;
      return {
        ...p,
        score: p.score + (correct ? 100 + timeBonus : 0),
        correctCount: p.correctCount + (correct ? 1 : 0),
        wrongCount: p.wrongCount + (!ans || !correct ? 1 : 0),
        answers: [...p.answers, { questionIndex: this.questionIndex$.value, answerId: ans || '', correct }]
      };
    });

    this.players$.next(updatedPlayers);
    const reveal: RevealData = { correctId: q.correctId, explanation: q.explanation, answers };
    this.revealData$.next(reveal);
    this.phase$.next('reveal');
    this.broadcast({ type: 'reveal', ...reveal, players: updatedPlayers });
  }

  nextQuestion() {
    const next = this.questionIndex$.value + 1;
    if (next >= this.questions.length) this.endGame();
    else this.dispatchQuestion(next);
  }

  private endGame() {
    const ranked = [...this.players$.value].sort((a, b) => b.score - a.score);
    this.rankings$.next(ranked);
    this.phase$.next('finished');
    this.broadcast({ type: 'game-over', rankings: ranked });
  }

  private broadcast(data: any) {
    this.connections.forEach(conn => { if (conn.open) conn.send(data); });
  }

  // ─────────────────────────────────────────────────────────────────
  // PLAYER – join a room
  // ─────────────────────────────────────────────────────────────────
  joinRoom(roomId: string): Promise<void> {
    this.roomId = roomId;
    this.isHost = false;
    this.peer = new Peer();

    return new Promise((resolve, reject) => {
      this.peer!.on('open', () => {
        const conn = this.peer!.connect(roomId);
        this.hostConn = conn;
        conn.on('open', () => resolve());
        conn.on('data', (data: any) => this.zone.run(() => this.handleHostMsg(data)));
        conn.on('error', reject);
      });
      this.peer!.on('error', (err: any) => {
        this.zone.run(() => {
          this.errorMsg$.next('No se pudo conectar: ' + err.message);
          this.phase$.next('error');
          reject(err);
        });
      });
    });
  }

  sendJoin() {
    this.hostConn?.send({ type: 'join', name: this.myName, avatar: this.myAvatar });
  }

  submitAnswer(answerId: string) {
    this.hostConn?.send({ type: 'answer', answerId, questionIndex: this.questionIndex$.value });
  }

  private handleHostMsg(data: any) {
    this.message$.next(data);
    switch (data.type) {
      case 'room-info':
        this.availableParticipants = data.participants;
        this.players$.next(data.players);
        break;
      case 'lobby-update':
        this.players$.next(data.players);
        break;
      case 'game-start':
        this.phase$.next('question');
        break;
      case 'question':
        this.currentQuestion$.next(data.question);
        this.questionIndex$.next(data.index);
        this.totalQuestions$.next(data.total);
        this.secondsLeft$.next(data.timeLimit);
        this.currentAnswers$.next({});
        this.revealData$.next(null);
        this.phase$.next('question');
        break;
      case 'timer':
        this.secondsLeft$.next(data.secondsLeft);
        break;
      case 'reveal':
        this.revealData$.next({ correctId: data.correctId, explanation: data.explanation, answers: data.answers });
        this.players$.next(data.players);
        this.phase$.next('reveal');
        break;
      case 'game-over':
        this.rankings$.next(data.rankings);
        this.phase$.next('finished');
        break;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Utils
  // ─────────────────────────────────────────────────────────────────
  private generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

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
    clearInterval(this.timerInterval);
    this.peer?.destroy();
    this.peer = null;
    this.connections.clear();
    this.hostConn = null;
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
    this.rankings$.next([]);
    this.errorMsg$.next('');
  }
}

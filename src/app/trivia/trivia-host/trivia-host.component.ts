import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import QRCode from 'qrcode';
import { TriviaService, GamePhase, TriviaPlayer, TriviaQuestion, RevealData } from '../trivia.service';
import { ParticipantService } from '../../participant.service';

@Component({
  selector: 'app-trivia-host',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="host-wrap animate-in">
  <header class="host-header">
    <button class="glass-button ghost back-btn" (click)="goBack()">
      <span>⬅️</span> <span class="btn-text">Volver</span>
    </button>
  </header>

  <!-- ════════ SETUP ════════ -->
  <div class="phase-card glass" *ngIf="phase === 'setup'">
    <div class="phase-icon">🧠</div>
    <h1 class="phase-title">Trivia</h1>
    <p class="phase-sub">Configura tu partida multijugador</p>

    <div class="form-grid">
      <label class="form-label">
        📚 Categoría
        <select class="glass-input" [(ngModel)]="selectedCategory">
          <option *ngFor="let c of triviaService.categories" [value]="c">{{ c }}</option>
        </select>
      </label>
      <div class="two-col">
        <label class="form-label">
          ❓ Nº de preguntas
          <input class="glass-input" type="number" [(ngModel)]="questionCount" min="3" max="20" />
        </label>
        <label class="form-label">
          ⏱ Tiempo por pregunta
          <select class="glass-input" [(ngModel)]="timeLimit">
            <option value="10">10 segundos</option>
            <option value="15">15 segundos</option>
            <option value="20">20 segundos</option>
            <option value="30">30 segundos</option>
            <option value="45">45 segundos</option>
          </select>
        </label>
      </div>
    </div>

    <button class="cta-btn" (click)="setupGame()">🚀 Crear Sala</button>
    <p class="participants-hint">
      👥 {{ participantCount }} participante{{ participantCount !== 1 ? 's' : '' }} registrados
    </p>
  </div>

  <!-- ════════ LOBBY ════════ -->
  <div class="phase-card glass lobby-layout" *ngIf="phase === 'lobby'">
    <div class="lobby-left">
      <h2 class="room-label">SALA</h2>
      <div class="room-code">{{ triviaService.roomId }}</div>
      <div class="qr-wrap" *ngIf="qrDataUrl" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 1.25rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; border-radius: 20px; max-width: 240px; margin-bottom: 1.5rem; backdrop-filter: blur(10px);">
        <div style="background: #fff; padding: 8px; border-radius: 12px; display: inline-block;">
          <img [src]="qrDataUrl" class="qr-img" style="width: 160px; height: 160px; display: block;" alt="QR Code" />
        </div>
        
        <div style="width: 100%; display: flex; flex-direction: column; gap: 0.5rem; align-items: center;">
          <p class="qr-url" style="color: rgba(255,255,255,0.6); font-size: 0.75rem; font-family: monospace; word-break: break-all; margin: 0; text-align: center;">{{ joinUrl }}</p>
          
          <button (click)="copyJoinUrl()" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 8px; padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>{{ copied ? '✅' : '📋' }}</span>
            <span>{{ copied ? '¡Copiado!' : 'Copiar enlace' }}</span>
          </button>
        </div>

        <div style="width: 100%; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; align-items: flex-start;">
          <span style="font-size: 0.7rem; color: rgba(255,255,255,0.45); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">¿El QR no funciona?</span>
          <span style="font-size: 0.65rem; color: rgba(255,255,255,0.35); line-height: 1.25;">Escribe la IP local de tu PC si usas móvil en red local:</span>
          <input type="text" [(ngModel)]="customIp" (ngModelChange)="onIpChange()" placeholder="Ej: 192.168.1.15" style="width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 0.35rem 0.5rem; color: #fff; font-family: monospace; font-size: 0.8rem; box-sizing: border-box; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='rgba(168,85,247,0.5)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'" />
        </div>
      </div>
      <div class="qr-wrap loading-qr" *ngIf="!qrDataUrl">
        <div class="spinner"></div>
      </div>

      <div class="game-config-badge">
        <span>📚 {{ selectedCategory }}</span>
        <span>❓ {{ triviaService.totalQuestions$.value }} preguntas</span>
        <span>⏱ {{ timeLimit }}s</span>
      </div>

      <button class="cta-btn"
              [disabled]="players.length === 0"
              (click)="startGame()">
        ▶ Iniciar Partida
      </button>
      <p class="hint-text" *ngIf="players.length === 0">Esperando jugadores...</p>
    </div>

    <div class="lobby-right">
      <h3 class="players-title">👥 Jugadores Conectados ({{ players.length }})</h3>
      <div class="players-scroll">
        <div class="player-card" *ngFor="let p of players">
          <img [src]="p.avatar" class="p-avatar" (error)="onImgErr($event, p.name)" />
          <span class="p-name">{{ p.name }}</span>
          <span class="p-badge" title="Conectado">✓ Listo</span>
        </div>
        <div class="empty-players" *ngIf="players.length === 0">
          <div class="scan-anim">📱</div>
          Escanea el QR para unirte
        </div>
      </div>

      <div class="initial-participants-section" *ngIf="pendingParticipants.length > 0">
        <h4 class="pending-title">⏳ Pendientes por unirse ({{ pendingParticipants.length }})</h4>
        <div class="pending-chips">
          <span class="pending-chip" *ngFor="let p of pendingParticipants">
            <img [src]="p.avatarUrl" class="chip-avatar" (error)="onImgErr($event, p.name)" />
            {{ p.name }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- ════════ QUESTION ════════ -->
  <div class="phase-card glass question-layout" *ngIf="phase === 'question' && currentQ">
    <div class="q-header">
      <span class="q-counter">Pregunta {{ qIndex + 1 }} / {{ totalQ }}</span>
      <span class="q-category">{{ currentQ.category }}</span>
    </div>

    <div class="timer-section">
      <svg class="ring-svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" class="ring-bg"/>
        <circle cx="50" cy="50" r="45" class="ring-prog"
                [style.stroke-dashoffset]="ringOffset"
                [class.ring-danger]="secondsLeft <= 5"/>
      </svg>
      <span class="ring-num" [class.num-danger]="secondsLeft <= 5">{{ secondsLeft }}</span>
    </div>

    <p class="question-text">{{ currentQ.text }}</p>

    <div class="options-grid">
      <div class="option-box" *ngFor="let opt of currentQ.options"
           [class]="'opt-' + opt.id">
        <span class="opt-letter">{{ opt.id.toUpperCase() }}</span>
        <span class="opt-text">{{ opt.text }}</span>
        <span class="opt-count badge" *ngIf="getAnswerCount(opt.id) > 0">
          {{ getAnswerCount(opt.id) }}
        </span>
      </div>
    </div>

    <div class="bottom-bar">
      <div class="prog-wrap">
        <div class="prog-bar"><div class="prog-fill" [style.width]="answerPercent + '%'"></div></div>
        <span class="prog-label">{{ answeredCount }}/{{ players.length }} respondieron</span>
      </div>
      <div class="player-status-row">
        <div class="ps-chip" *ngFor="let p of players" [title]="p.name"
             [class.answered]="hasAnswered(p.name)">
          <img [src]="p.avatar" class="ps-av" (error)="onImgErr($event, p.name)" />
          <span class="ps-status">{{ hasAnswered(p.name) ? '✓' : '…' }}</span>
        </div>
      </div>
      <button class="reveal-btn" (click)="reveal()">👁 Revelar respuesta</button>
    </div>
  </div>

  <!-- ════════ REVEAL ════════ -->
  <div class="phase-card glass reveal-layout" *ngIf="phase === 'reveal' && currentQ">
    <h2 class="reveal-title">✅ Respuesta Correcta</h2>

    <div class="options-grid">
      <div class="option-box" *ngFor="let opt of currentQ.options"
           [class]="'opt-' + opt.id"
           [class.correct-opt]="opt.id === revealData?.correctId"
           [class.wrong-opt]="opt.id !== revealData?.correctId">
        <span class="opt-letter">{{ opt.id.toUpperCase() }}</span>
        <span class="opt-text">{{ opt.text }}</span>
        <span class="correct-check" *ngIf="opt.id === revealData?.correctId">✓</span>
      </div>
    </div>

    <!-- ⚡ Fastest Winner Banner -->
    <div class="winner-highlight animate-in" *ngIf="roundWinner">
      <span class="winner-trophy">⚡</span>
      <img [src]="roundWinner.avatar" class="winner-av" (error)="onImgErr($event, roundWinner.name)" />
      <div class="winner-info">
        <span class="winner-title">¡El más rápido!</span>
        <span class="winner-name">{{ roundWinner.name }} respondió en <strong>{{ roundWinner.seconds }}s</strong></span>
      </div>
      <span class="winner-pts">+{{ roundWinner.pointsGained }} pts</span>
    </div>

    <div class="no-winner-highlight animate-in" *ngIf="!roundWinner">
      <span class="no-winner-icon">⏱️</span>
      <span>Nadie respondió correctamente a tiempo</span>
    </div>

    <p class="explanation" *ngIf="currentQ.explanation">💡 {{ currentQ.explanation }}</p>

    <div class="results-row">
      <div class="result-card"
           *ngFor="let p of players"
           [class.res-correct]="revealData && revealData.answers && revealData.answers[p.name] === revealData.correctId"
           [class.res-wrong]="revealData && revealData.answers && revealData.answers[p.name] && revealData.answers[p.name] !== revealData.correctId"
           [class.res-none]="!revealData?.answers?.[p.name]">
        <img [src]="p.avatar" class="res-avatar" (error)="onImgErr($event, p.name)" />
        <span class="res-name">{{ p.name }}</span>
        <span class="res-icon">
          {{ revealData && revealData.answers && revealData.answers[p.name] === revealData.correctId ? '🎉' :
             revealData && revealData.answers && revealData.answers[p.name] ? '❌' : '⏰' }}
        </span>
        <span class="res-pts">{{ p.score }} pts</span>
      </div>
    </div>

    <button class="cta-btn" (click)="next()">
      {{ qIndex + 1 < totalQ ? '➡ Siguiente Pregunta' : '🏆 Ver Resultados' }}
    </button>
  </div>

  <!-- ════════ FINISHED ════════ -->
  <div class="phase-card glass finished-layout" *ngIf="phase === 'finished'">
    <h1 class="podium-title">🏆 Resultados Finales</h1>
    <p class="category-badge">{{ selectedCategory }}</p>

    <div class="podium-wrap">
      <div class="podium-slot silver" *ngIf="rankings[1]">
        <img [src]="rankings[1].avatar" class="pod-avatar" (error)="onImgErr($event, rankings[1].name)" />
        <span class="pod-name">{{ rankings[1].name }}</span>
        <span class="pod-score">{{ rankings[1].score }} pts</span>
        <div class="pod-block silver-block">🥈</div>
      </div>
      <div class="podium-slot gold" *ngIf="rankings[0]">
        <img [src]="rankings[0].avatar" class="pod-avatar gold-av" (error)="onImgErr($event, rankings[0].name)" />
        <span class="pod-name">{{ rankings[0].name }}</span>
        <span class="pod-score">{{ rankings[0].score }} pts</span>
        <div class="pod-block gold-block">🥇</div>
      </div>
      <div class="podium-slot bronze" *ngIf="rankings[2]">
        <img [src]="rankings[2].avatar" class="pod-avatar" (error)="onImgErr($event, rankings[2].name)" />
        <span class="pod-name">{{ rankings[2].name }}</span>
        <span class="pod-score">{{ rankings[2].score }} pts</span>
        <div class="pod-block bronze-block">🥉</div>
      </div>
    </div>

    <div class="rank-list">
      <div class="rank-row" *ngFor="let p of rankings; let i = index">
        <span class="rank-pos" [class.gold-text]="i===0" [class.silver-text]="i===1" [class.bronze-text]="i===2">#{{ i+1 }}</span>
        <img [src]="p.avatar" class="rank-av" (error)="onImgErr($event, p.name)" />
        <span class="rank-name">{{ p.name }}</span>
        <span class="rank-correct">✅ {{ p.correctCount }}</span>
        <span class="rank-wrong">❌ {{ p.wrongCount }}</span>
        <span class="rank-score">{{ p.score }} pts</span>
      </div>
    </div>

    <button class="cta-btn" (click)="newGame()">🔄 Nueva Partida</button>
  </div>

  <!-- ════════ ERROR ════════ -->
  <div class="phase-card glass error-card" *ngIf="phase === 'error'">
    <div class="err-icon">⚠️</div>
    <h2>Error de conexión</h2>
    <p>{{ triviaService.errorMsg$.value }}</p>
    <button class="cta-btn" (click)="goBack()">Volver al inicio</button>
  </div>
</div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');

    .host-wrap {
      min-height: 100dvh;
      background: transparent;
      font-family: 'Outfit', sans-serif;
      color: #fff;
      display: flex; flex-direction: column; align-items: center;
      padding: 1rem 1rem var(--safe-bottom) 1rem;
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
    }

    .host-header {
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 950px;
      margin-bottom: 0.5rem;
      padding: 0.5rem 0;
    }

    .back-btn {
      font-size: 0.95rem;
      padding: 0.6rem 1.2rem;
    }

    .glass {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px; backdrop-filter: blur(20px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }

    .phase-card { width: 100%; max-width: 950px; padding: 2.5rem; margin-top: 3rem; }

    /* SETUP */
    .phase-icon { font-size: 4rem; text-align: center; margin-bottom: 0.5rem; }
    .phase-title {
      font-size: 2.5rem; font-weight: 900; text-align: center;
      background: linear-gradient(135deg, #a855f7, #06b6d4);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .phase-sub { text-align: center; color: rgba(255,255,255,0.6); margin-bottom: 2rem; }

    .form-grid { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-label { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem; color: rgba(255,255,255,0.7); }
    .glass-input {
      background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 12px; color: #fff; padding: 0.7rem 1rem;
      font-family: 'Outfit', sans-serif; font-size: 1rem; outline: none;
      transition: border 0.2s;
    }
    .glass-input:focus { border-color: rgba(168,85,247,0.6); }
    .glass-input option { background: #1a0a2e; color: #fff; }

    .cta-btn {
      width: 100%; padding: 1rem; border: none; border-radius: 14px;
      background: linear-gradient(135deg, #a855f7, #06b6d4); color: #fff;
      font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 700;
      cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; margin-top: 0.5rem;
    }
    .cta-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(168,85,247,0.5); }
    .cta-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .hint-text { text-align: center; color: rgba(255,255,255,0.5); font-size: 0.85rem; margin-top: 0.5rem; }
    .participants-hint { text-align: center; color: rgba(255,255,255,0.5); font-size: 0.85rem; margin-top: 0.75rem; }

    /* LOBBY */
    .lobby-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    @media (max-width: 700px) { .lobby-layout { grid-template-columns: 1fr; } }

    .room-label { font-size: 0.85rem; color: rgba(255,255,255,0.4); letter-spacing: 4px; text-transform: uppercase; }
    .room-code {
      font-size: 3rem; font-weight: 900; letter-spacing: 8px;
      background: linear-gradient(135deg, #a855f7, #06b6d4);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      margin-bottom: 1.5rem;
    }
    .qr-wrap {
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      background: #fff; padding: 10px; border-radius: 14px;
      margin-bottom: 1rem; max-width: 200px;
    }
    .qr-img { width: 170px; height: 170px; display: block; }
    .qr-url { font-size: 0.6rem; color: #333; word-break: break-all; text-align: center; }
    .loading-qr { background: rgba(255,255,255,0.05); min-height: 80px; justify-content: center; }

    .game-config-badge {
      display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;
    }
    .game-config-badge span {
      background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3);
      color: #c084fc; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem;
    }

    .players-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; }
    .players-scroll { display: flex; flex-direction: column; gap: 0.5rem; max-height: 380px; overflow-y: auto; }
    .player-card {
      display: flex; align-items: center; gap: 0.75rem;
      background: rgba(255,255,255,0.05); border-radius: 12px; padding: 0.6rem 1rem;
      animation: slideIn 0.3s ease;
    }
    .p-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid rgba(168,85,247,0.5); }
    .p-name { flex: 1; font-weight: 600; }
    .p-badge { color: #22c55e; font-size: 1.2rem; }
    .empty-players { color: rgba(255,255,255,0.4); text-align: center; padding: 2.5rem; font-style: italic; }
    .scan-anim { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; animation: bounce 1s ease infinite; }

    .initial-participants-section {
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .pending-title {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.5);
      font-weight: 600;
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pending-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .pending-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 20px;
      padding: 0.25rem 0.65rem;
      font-size: 0.8rem;
      color: rgba(255,255,255,0.7);
    }
    .chip-avatar {
      width: 18px;
      height: 18px;
      border-radius: 50%;
    }

    /* QUESTION */
    .question-layout { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; }
    .q-header { display: flex; justify-content: space-between; align-items: center; width: 100%; }
    .q-counter { font-weight: 700; color: #a855f7; }
    .q-category {
      background: rgba(6,182,212,0.15); color: #06b6d4;
      padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.85rem;
    }

    .timer-section { position: relative; width: 110px; height: 110px; }
    .ring-svg { transform: rotate(-90deg); width: 110px; height: 110px; }
    .ring-bg { fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 8; }
    .ring-prog {
      fill: none; stroke: #a855f7; stroke-width: 8;
      stroke-dasharray: 283; transition: stroke-dashoffset 1s linear;
      stroke-linecap: round;
    }
    .ring-prog.ring-danger { stroke: #f43f5e; }
    .ring-num {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 2rem; font-weight: 900;
    }
    .ring-num.num-danger { color: #f43f5e; }

    .question-text { font-size: 1.6rem; font-weight: 700; text-align: center; line-height: 1.3; max-width: 700px; }

    .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; }
    .option-box {
      display: flex; align-items: center; gap: 0.75rem; position: relative;
      padding: 0.9rem 1rem; border-radius: 14px; border: 2px solid transparent;
      transition: all 0.3s;
    }
    .opt-a { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.35); }
    .opt-b { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.35); }
    .opt-c { background: rgba(234,179,8,0.15); border-color: rgba(234,179,8,0.35); }
    .opt-d { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.35); }
    .opt-letter {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 0.9rem; background: rgba(255,255,255,0.15);
    }
    .opt-text { flex: 1; font-size: 0.95rem; font-weight: 600; }
    .badge {
      background: rgba(255,255,255,0.2); border-radius: 20px;
      padding: 0.1rem 0.5rem; font-size: 0.85rem; font-weight: 700;
    }
    .correct-opt { border-color: #22c55e !important; background: rgba(34,197,94,0.25) !important; box-shadow: 0 0 20px rgba(34,197,94,0.3); }
    .wrong-opt { opacity: 0.35; }
    .correct-check { position: absolute; right: 12px; font-size: 1.3rem; color: #22c55e; font-weight: 900; }

    .bottom-bar { width: 100%; display: flex; flex-direction: column; gap: 0.75rem; }
    .prog-wrap { }
    .prog-bar { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-bottom: 4px; }
    .prog-fill { height: 100%; background: linear-gradient(90deg, #a855f7, #06b6d4); transition: width 0.5s; border-radius: 4px; }
    .prog-label { font-size: 0.85rem; color: rgba(255,255,255,0.6); }

    .player-status-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .ps-chip {
      display: flex; align-items: center; gap: 4px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px; padding: 3px 8px 3px 4px;
      transition: all 0.3s;
    }
    .ps-chip.answered { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.4); }
    .ps-av { width: 24px; height: 24px; border-radius: 50%; }
    .ps-status { font-size: 0.7rem; }

    .reveal-btn {
      padding: 0.7rem 1.5rem; border: 1px solid rgba(255,255,255,0.25);
      background: rgba(255,255,255,0.07); color: #fff; border-radius: 12px;
      font-family: 'Outfit', sans-serif; font-size: 0.95rem; cursor: pointer;
      transition: all 0.2s; align-self: flex-end;
    }
    .reveal-btn:hover { background: rgba(255,255,255,0.12); transform: translateY(-1px); }

    /* REVEAL */
    .reveal-layout { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
    .reveal-title { font-size: 1.8rem; font-weight: 800; color: #22c55e; }

    .winner-highlight {
      display: flex; align-items: center; gap: 1.25rem;
      background: linear-gradient(135deg, rgba(234,179,8,0.2), rgba(168,85,247,0.25));
      border: 2px solid #fbbf24; border-radius: 20px;
      padding: 1rem 1.75rem; width: 100%; max-width: 700px;
      box-shadow: 0 0 30px rgba(251,191,36,0.3);
    }
    .winner-trophy { font-size: 2.2rem; filter: drop-shadow(0 0 8px rgba(251,191,36,0.6)); }
    .winner-av { width: 52px; height: 52px; border-radius: 50%; border: 3px solid #fbbf24; }
    .winner-info { display: flex; flex-direction: column; flex: 1; }
    .winner-title { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #fbbf24; font-weight: 800; }
    .winner-name { font-size: 1.2rem; font-weight: 700; color: #fff; }
    .winner-pts { font-size: 1.4rem; font-weight: 900; color: #fbbf24; }

    .no-winner-highlight {
      display: flex; align-items: center; justify-content: center; gap: 0.75rem;
      background: rgba(255,255,255,0.06); border: 1px dashed rgba(255,255,255,0.2);
      border-radius: 16px; padding: 0.9rem 1.5rem; width: 100%; max-width: 700px;
      font-size: 1rem; color: rgba(255,255,255,0.7);
    }
    .no-winner-icon { font-size: 1.4rem; }
    .explanation {
      background: rgba(6,182,212,0.08); border-left: 3px solid #06b6d4;
      padding: 0.9rem 1.2rem; border-radius: 8px; font-size: 0.95rem;
      color: rgba(255,255,255,0.8); max-width: 700px; width: 100%;
    }
    .results-row { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center; width: 100%; }
    .result-card {
      display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px; padding: 0.75rem; width: 95px;
      animation: popIn 0.4s ease;
    }
    .res-correct { border-color: rgba(34,197,94,0.5); background: rgba(34,197,94,0.1); }
    .res-wrong { border-color: rgba(239,68,68,0.5); background: rgba(239,68,68,0.1); }
    .res-none { opacity: 0.5; }
    .res-avatar { width: 40px; height: 40px; border-radius: 50%; }
    .res-name { font-size: 0.75rem; font-weight: 600; text-align: center; }
    .res-icon { font-size: 1.3rem; }
    .res-pts { font-size: 0.8rem; color: #a855f7; font-weight: 700; }

    /* FINISHED */
    .finished-layout { display: flex; flex-direction: column; align-items: center; gap: 2rem; }
    .podium-title { font-size: 2rem; font-weight: 900; text-align: center; }
    .category-badge {
      background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3);
      color: #c084fc; padding: 0.3rem 1rem; border-radius: 20px; font-size: 0.9rem;
    }
    .podium-wrap { display: flex; align-items: flex-end; gap: 0.5rem; justify-content: center; }
    .podium-slot { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
    .pod-avatar { width: 56px; height: 56px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); }
    .gold-av { border-color: #fbbf24; box-shadow: 0 0 20px rgba(251,191,36,0.4); }
    .pod-name { font-size: 0.8rem; font-weight: 700; text-align: center; }
    .pod-score { font-size: 0.75rem; color: rgba(255,255,255,0.6); }
    .pod-block { display: flex; align-items: center; justify-content: center; width: 75px; border-radius: 6px 6px 0 0; font-size: 1.6rem; }
    .gold-block { height: 75px; background: linear-gradient(to top, #f59e0b, #fbbf24); }
    .silver-block { height: 55px; background: linear-gradient(to top, #64748b, #94a3b8); }
    .bronze-block { height: 42px; background: linear-gradient(to top, #a16207, #cd7f32); }
    .rank-list { width: 100%; display: flex; flex-direction: column; gap: 0.4rem; max-height: 350px; overflow-y: auto; }
    .rank-row {
      display: flex; align-items: center; gap: 1rem;
      background: rgba(255,255,255,0.04); border-radius: 12px; padding: 0.65rem 1rem;
    }
    .rank-pos { font-size: 1.1rem; font-weight: 900; width: 36px; text-align: center; }
    .gold-text { color: #fbbf24; }
    .silver-text { color: #94a3b8; }
    .bronze-text { color: #cd7f32; }
    .rank-av { width: 36px; height: 36px; border-radius: 50%; }
    .rank-name { flex: 1; font-weight: 600; }
    .rank-correct { color: #22c55e; font-weight: 700; font-size: 0.9rem; }
    .rank-wrong { color: #f87171; font-weight: 700; font-size: 0.9rem; }
    .rank-score { color: #a855f7; font-weight: 800; }

    /* Error */
    .error-card { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
    .err-icon { font-size: 4rem; }

    /* Spinner */
    .spinner {
      width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #a855f7; border-radius: 50%; animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes slideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
    @keyframes popIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class TriviaHostComponent implements OnInit, OnDestroy {
  phase: GamePhase = 'setup';
  players: TriviaPlayer[] = [];
  currentQ: TriviaQuestion | null = null;
  qIndex = 0;
  totalQ = 0;
  secondsLeft = 0;
  revealData: RevealData | null = null;
  roundWinner: any = null;
  rankings: TriviaPlayer[] = [];
  currentAnswers: { [name: string]: string } = {};

  // Setup form
  selectedCategory = 'Mixto';
  questionCount = 10;
  timeLimit = 20;

  // Lobby
  qrDataUrl = '';
  joinUrl = '';
  customIp = '';
  copied = false;

  get participantCount() { return this.participantService.participants.length; }
  get pendingParticipants() {
    const connectedNames = new Set(this.players.map(p => p.name));
    return this.participantService.participants.filter(p => !connectedNames.has(p.name));
  }
  get answeredCount() { return this.triviaService.answeredCount$.value; }
  get answerPercent() { return this.players.length > 0 ? (this.answeredCount / this.players.length) * 100 : 0; }
  get ringOffset() { return 283 - (283 * this.secondsLeft / (this.triviaService.timeLimit || 20)); }

  private subs: Subscription[] = [];

  constructor(
    public triviaService: TriviaService,
    private participantService: ParticipantService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.participantService.loadParticipants();
    this.subs.push(
      this.triviaService.phase$.subscribe(p => { this.phase = p; this.cdr.markForCheck(); }),
      this.triviaService.players$.subscribe(p => { this.players = p; this.cdr.markForCheck(); }),
      this.triviaService.currentQuestion$.subscribe(q => { this.currentQ = q; this.cdr.markForCheck(); }),
      this.triviaService.questionIndex$.subscribe(i => { this.qIndex = i; this.cdr.markForCheck(); }),
      this.triviaService.totalQuestions$.subscribe(t => { this.totalQ = t; this.cdr.markForCheck(); }),
      this.triviaService.secondsLeft$.subscribe(s => { this.secondsLeft = s; this.cdr.markForCheck(); }),
      this.triviaService.currentAnswers$.subscribe(a => { this.currentAnswers = a; this.cdr.markForCheck(); }),
      this.triviaService.revealData$.subscribe(r => { this.revealData = r; this.cdr.markForCheck(); }),
      this.triviaService.roundWinner$.subscribe(w => { this.roundWinner = w; this.cdr.markForCheck(); }),
      this.triviaService.rankings$.subscribe(r => { this.rankings = r; this.cdr.markForCheck(); })
    );
  }

  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }

  async setupGame() {
    this.participantService.loadParticipants();
    this.triviaService.timeLimit = Number(this.timeLimit);

    const participants = this.participantService.participants.map(p => ({
      name: p.name, avatar: p.avatarUrl
    }));

    const roomId = await this.triviaService.createRoom(participants, this.selectedCategory, Number(this.questionCount));
    
    // Detect and save local IP
    const ip = await this.triviaService.getLocalIP();
    this.customIp = ip;
    
    await this.buildQR(roomId);
  }

  private async buildQR(roomId: string) {
    let url = '';
    const hostname = window.location.hostname;

    if (hostname.includes('github.io') || hostname.includes('jacoher.github.io')) {
      url = `https://jacoher.github.io/daily-games/trivia/play?room=${roomId}`;
    } else {
      const port = window.location.port || '4200';
      const host = this.customIp || hostname || 'localhost';
      url = `http://${host}:${port}/trivia/play?room=${roomId}`;
    }

    this.joinUrl = url;
    this.qrDataUrl = await QRCode.toDataURL(url, {
      width: 180, margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });
  }

  async onIpChange() {
    if (this.triviaService.roomId) {
      await this.buildQR(this.triviaService.roomId);
    }
  }

  copyJoinUrl() {
    navigator.clipboard.writeText(this.joinUrl).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
      this.cdr.markForCheck();
    });
  }

  startGame() { this.triviaService.startGame(); }
  reveal() { this.triviaService.revealQuestion(); }
  next() { this.triviaService.nextQuestion(); }

  hasAnswered(name: string) { return !!this.currentAnswers[name]; }
  getAnswerCount(optId: string) { return Object.values(this.currentAnswers).filter(v => v === optId).length; }

  onImgErr(e: any, name: string) {
    e.target.src = 'https://api.dicebear.com/7.x/pixel-art/png?seed=' + encodeURIComponent(name);
  }

  newGame() { this.triviaService.reset(); }

  goBack() {
    this.triviaService.reset();
    this.router.navigate(['/']);
  }
}

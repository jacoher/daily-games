import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TriviaService, GamePhase, TriviaPlayer, TriviaQuestion, RevealData } from '../trivia.service';

@Component({
  selector: 'app-trivia-player',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="player-wrap animate-in">
  <header class="player-header" *ngIf="phase === 'lobby' || phase === 'error' || connecting">
    <button class="glass-button ghost back-btn" (click)="goBack()">
      <span>⬅️</span> <span class="btn-text">Volver</span>
    </button>
  </header>

  <!-- ════ CONNECTING ════ -->
  <div class="center-screen" *ngIf="connecting">
    <div class="big-spinner"></div>
    <p class="connect-msg">Conectando a la sala...</p>
    <p class="room-code-sm">{{ roomId }}</p>
  </div>

  <!-- ════ ERROR ════ -->
  <div class="center-screen" *ngIf="phase === 'error' && !connecting">
    <div class="err-emoji">⚠️</div>
    <h2 class="err-title">Error de conexión</h2>
    <p class="err-msg">{{ triviaService.errorMsg$.value }}</p>
    <p class="err-hint">Verifica que el host esté activo e intenta de nuevo.</p>
  </div>

  <!-- ════ LOBBY / SELECT AVATAR ════ -->
  <div class="lobby-screen" *ngIf="phase === 'lobby' && !connecting">
    <div class="room-badge">SALA {{ roomId }}</div>

    <div *ngIf="!myName" class="avatar-picker">
      <h1 class="pick-title">¿Quién eres?</h1>
      <p class="pick-sub">Selecciona tu nombre de la lista</p>
      <div class="avatar-grid">
        <button class="avatar-btn"
                *ngFor="let p of availableParticipants"
                [class.taken]="isTaken(p.name)"
                [disabled]="isTaken(p.name)"
                (click)="selectMe(p)">
          <img [src]="p.avatar" class="av-img" (error)="onImgErr($event, p)" />
          <span class="av-name">{{ p.name }}</span>
          <span class="taken-label" *ngIf="isTaken(p.name)">✓ En partida</span>
        </button>
      </div>
    </div>

    <div *ngIf="myName" class="waiting-screen">
      <img [src]="myAvatar" class="my-avatar" (error)="onSelfImgErr($event)" />
      <h2 class="waiting-name">{{ myName }}</h2>
      <div class="pulse-ring"></div>
      <p class="waiting-msg">Esperando que el host inicie la partida...</p>

      <div class="joined-players">
        <h3>Jugadores en sala ({{ joinedPlayers.length }})</h3>
        <div class="joined-row" *ngFor="let p of joinedPlayers">
          <img [src]="p.avatar" class="jav" (error)="onImgErr($event, p)" />
          <span [class.is-me]="p.name === myName">{{ p.name }}</span>
          <span class="me-badge" *ngIf="p.name === myName">Tú</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ════ QUESTION ════ -->
  <div class="question-screen" *ngIf="phase === 'question' && currentQ && !connecting">
    <div class="q-meta">
      <span class="q-num">{{ qIndex + 1 }}/{{ totalQ }}</span>
      <span class="q-cat">{{ currentQ.category }}</span>
      <span class="q-timer" [class.urgent]="secondsLeft <= 5">{{ secondsLeft }}s</span>
    </div>

    <div class="timer-bar-wrap">
      <div class="timer-bar" [style.width]="timerPercent + '%'"
           [class.danger-bar]="secondsLeft <= 5"></div>
    </div>

    <p class="q-text">{{ currentQ.text }}</p>

    <div class="ans-grid" *ngIf="!myAnswer">
      <button class="ans-btn opt-a" (click)="answer('a')" [disabled]="!!myAnswer">
        <span class="ans-letter">A</span>
        <span class="ans-text">{{ currentQ.options[0]?.text }}</span>
      </button>
      <button class="ans-btn opt-b" (click)="answer('b')" [disabled]="!!myAnswer">
        <span class="ans-letter">B</span>
        <span class="ans-text">{{ currentQ.options[1]?.text }}</span>
      </button>
      <button class="ans-btn opt-c" (click)="answer('c')" [disabled]="!!myAnswer">
        <span class="ans-letter">C</span>
        <span class="ans-text">{{ currentQ.options[2]?.text }}</span>
      </button>
      <button class="ans-btn opt-d" (click)="answer('d')" [disabled]="!!myAnswer">
        <span class="ans-letter">D</span>
        <span class="ans-text">{{ currentQ.options[3]?.text }}</span>
      </button>
    </div>

    <div class="answered-msg" *ngIf="myAnswer">
      <div class="ans-selected opt-{{ myAnswer }}">
        <span class="ans-letter">{{ myAnswer.toUpperCase() }}</span>
        <span class="ans-text">{{ getOptionText(myAnswer) }}</span>
      </div>
      <p class="wait-reveal">⏳ Esperando que el host revele la respuesta...</p>
    </div>

    <div class="no-answer-msg" *ngIf="secondsLeft <= 0 && !myAnswer">
      <span class="timeout-emoji">⏰</span>
      <p>¡Tiempo agotado!</p>
    </div>
  </div>

  <!-- ════ REVEAL ════ -->
  <div class="reveal-screen" *ngIf="phase === 'reveal' && currentQ && !connecting">
    <div class="reveal-result" [class.correct-result]="isCorrect" [class.wrong-result]="!isCorrect && !!myAnswer" [class.timeout-result]="!myAnswer">
      <div class="result-emoji">
        {{ isFastestWinner ? '⚡' : isCorrect ? '🎉' : myAnswer ? '😢' : '⏰' }}
      </div>
      <h2 class="result-text">
        {{ isFastestWinner ? '¡Fuiste el más rápido!' : isCorrect ? '¡Correcto!' : myAnswer ? '¡Incorrecto!' : '¡Sin respuesta!' }}
      </h2>
      <p class="pts-earned" *ngIf="isFastestWinner">🏆 ¡Ganaste la ronda! (+{{ roundWinner?.pointsGained }} pts)</p>
      <p class="pts-earned" *ngIf="isCorrect && !isFastestWinner">+50 puntos (¡{{ roundWinner?.name }} fue más rápido!)</p>
    </div>

    <div class="correct-answer-box">
      <span class="ca-label">Respuesta correcta:</span>
      <div class="ca-value opt-{{ revealData?.correctId }}">
        <span class="ans-letter">{{ revealData?.correctId?.toUpperCase() }}</span>
        <span class="ans-text">{{ getOptionText(revealData?.correctId || '') }}</span>
      </div>
    </div>

    <div class="my-score-box">
      <span class="score-label">Tu puntaje</span>
      <span class="score-value">{{ myScore }} pts</span>
    </div>

    <div class="mini-ranking">
      <h3>Clasificación</h3>
      <div class="rank-row" *ngFor="let p of sortedPlayers; let i = index"
           [class.is-me-row]="p.name === myName">
        <span class="rk-pos">{{ i + 1 }}</span>
        <img [src]="p.avatar" class="rk-av" (error)="onImgErr($event, p)" />
        <span class="rk-name">{{ p.name }}</span>
        <span class="rk-pts">{{ p.score }}</span>
      </div>
    </div>
  </div>

  <!-- ════ FINISHED ════ -->
  <div class="finished-screen" *ngIf="phase === 'finished' && !connecting">
    <h1 class="fin-title">🏆 Juego Terminado</h1>

    <div class="my-final-pos">
      <div class="pos-number" [class.gold]="myPosition === 1" [class.silver]="myPosition === 2" [class.bronze]="myPosition === 3">
        #{{ myPosition }}
      </div>
      <img [src]="myAvatar" class="final-avatar" (error)="onSelfImgErr($event)" />
      <p class="my-final-name">{{ myName }}</p>
      <p class="my-final-score">{{ myScore }} puntos</p>
      <p class="my-stats">✅ {{ myCorrect }} correctas &nbsp; ❌ {{ myWrong }} incorrectas</p>
    </div>

    <div class="final-ranking">
      <div class="fk-row" *ngFor="let p of rankings; let i = index"
           [class.fk-me]="p.name === myName">
        <span class="fk-pos" [class.fk-gold]="i===0" [class.fk-silver]="i===1" [class.fk-bronze]="i===2">
          {{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i+1) }}
        </span>
        <img [src]="p.avatar" class="fk-av" (error)="onImgErr($event, p)" />
        <span class="fk-name">{{ p.name }}</span>
        <span class="fk-correct">✅{{ p.correctCount }}</span>
        <span class="fk-wrong">❌{{ p.wrongCount }}</span>
        <span class="fk-score">{{ p.score }}</span>
      </div>
    </div>
  </div>

</div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');

    /* Reset wildcard removed to prevent overriding global styles */

    .player-wrap {
      min-height: 100dvh;
      background: transparent;
      font-family: 'Outfit', sans-serif;
      color: #fff;
      padding: clamp(1rem, 3vw, 2rem) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
      overflow-x: hidden;
      box-sizing: border-box;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    .player-header {
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 600px;
      margin-bottom: 1rem;
      margin-left: auto;
      margin-right: auto;
    }

    .back-btn {
      font-size: 0.95rem;
      padding: 0.6rem 1.2rem;
    }

    /* Centering helper */
    .center-screen {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: calc(100dvh - 2rem); gap: 1rem; text-align: center; padding: 2rem;
      animation: slideUp 0.4s ease-out;
    }

    .big-spinner {
      width: 60px; height: 60px;
      border: 4px solid rgba(255,255,255,0.1);
      border-top-color: #a855f7; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .connect-msg { font-size: 1.2rem; color: rgba(255,255,255,0.8); }
    .room-code-sm { font-size: 2rem; font-weight: 900; letter-spacing: 6px; color: #a855f7; }

    /* Error */
    .err-emoji { font-size: 4rem; }
    .err-title { font-size: 1.5rem; font-weight: 800; }
    .err-msg { color: #f87171; font-size: 1rem; }
    .err-hint { color: rgba(255,255,255,0.5); font-size: 0.9rem; }

    /* LOBBY */
    .lobby-screen { padding: 1rem 0; animation: slideUp 0.4s ease-out; }
    .room-badge {
      display: inline-block; background: rgba(168,85,247,0.2);
      border: 1px solid rgba(168,85,247,0.4); color: #a855f7;
      padding: 0.4rem 1.2rem; border-radius: 20px; font-size: 0.9rem;
      letter-spacing: 3px; font-weight: 700; margin-bottom: 1.5rem;
    }

    .pick-title { font-size: 2rem; font-weight: 900; margin-bottom: 0.5rem; }
    .pick-sub { color: rgba(255,255,255,0.6); margin-bottom: 1.5rem; font-size: 1.1rem; }

    .avatar-grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    @media (min-width: 600px) {
      .avatar-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    }
    
    .avatar-btn {
      display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
      background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1);
      border-radius: 20px; padding: 1.5rem 0.5rem;
      cursor: pointer; color: #fff; font-family: 'Outfit', sans-serif;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); position: relative;
    }
    .avatar-btn:hover:not(:disabled) {
      border-color: rgba(168,85,247,0.6); background: rgba(168,85,247,0.1);
      transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    }
    .avatar-btn:active:not(:disabled) { transform: translateY(0); }
    .avatar-btn.taken { opacity: 0.4; cursor: not-allowed; }
    .av-img { width: 70px; height: 70px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); }
    .av-name { font-size: 1rem; font-weight: 700; text-align: center; }
    .taken-label { font-size: 0.75rem; color: #22c55e; font-weight: 600; background: rgba(34,197,94,0.2); padding: 0.2rem 0.6rem; border-radius: 12px; }

    /* Waiting */
    .waiting-screen { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; padding: 2rem 0; animation: slideUp 0.4s ease-out; }
    .my-avatar { width: 100px; height: 100px; border-radius: 50%; border: 4px solid #a855f7; box-shadow: 0 0 25px rgba(168,85,247,0.5); z-index: 2; position: relative; }
    .waiting-name { font-size: 1.8rem; font-weight: 800; }
    .waiting-msg { color: rgba(255,255,255,0.6); text-align: center; font-size: 1.1rem; }

    .pulse-ring {
      position: absolute;
      top: 2rem;
      width: 100px; height: 100px; border-radius: 50%;
      border: 3px solid rgba(168,85,247,0.8);
      animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      z-index: 1;
    }
    @keyframes pulse-ring {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(2); opacity: 0; }
    }

    .joined-players { width: 100%; max-width: 400px; margin-top: 1rem; background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 20px; }
    .joined-players h3 { font-size: 1.1rem; color: rgba(255,255,255,0.8); margin-bottom: 1rem; text-align: center; }
    .joined-row {
      display: flex; align-items: center; gap: 1rem;
      background: rgba(255,255,255,0.05); border-radius: 12px; padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
    }
    .jav { width: 40px; height: 40px; border-radius: 50%; }
    .is-me { font-weight: 800; color: #a855f7; font-size: 1.1rem; }
    .me-badge { margin-left: auto; background: rgba(168,85,247,0.2); color: #a855f7; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.85rem; font-weight: 700; }

    /* QUESTION */
    .question-screen { padding: 1rem 0; min-height: calc(100dvh - 2rem); display: flex; flex-direction: column; gap: 1.5rem; animation: slideUp 0.3s ease-out; }

    .q-meta { display: flex; align-items: center; gap: 1rem; }
    .q-num { font-weight: 800; font-size: 1.1rem; color: rgba(255,255,255,0.7); }
    .q-cat {
      flex: 1; background: rgba(6,182,212,0.15); color: #06b6d4;
      padding: 0.3rem 1rem; border-radius: 20px; font-size: 0.9rem; text-align: center; font-weight: 600;
    }
    .q-timer {
      font-size: 1.6rem; font-weight: 900; width: 60px; text-align: right;
      color: #a855f7; transition: color 0.3s;
    }
    .q-timer.urgent { color: #f43f5e; animation: pulse-text 0.5s ease infinite alternate; }
    @keyframes pulse-text { to { transform: scale(1.1); } }

    .timer-bar-wrap {
      height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
    }
    .timer-bar {
      height: 100%; background: linear-gradient(90deg, #a855f7, #06b6d4);
      transition: width 1s linear; border-radius: 5px;
    }
    .timer-bar.danger-bar { background: linear-gradient(90deg, #f43f5e, #fb923c); }

    .q-text {
      font-size: 1.6rem; font-weight: 800; line-height: 1.4;
      padding: 1.5rem 0; flex: 1; display: flex; align-items: center; justify-content: center; text-align: center;
    }

    .ans-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
    @media (min-width: 600px) {
      .ans-grid { grid-template-columns: 1fr 1fr; }
    }
    
    .ans-btn {
      display: flex; align-items: center; gap: 1rem;
      padding: 1.25rem; border: 3px solid transparent; border-radius: 20px;
      cursor: pointer; color: #fff; font-family: 'Outfit', sans-serif;
      font-size: 1.1rem; font-weight: 700; text-align: left;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      min-height: 90px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .ans-btn:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
    .ans-btn:active:not(:disabled) { transform: scale(0.98); }
    .ans-btn:disabled { cursor: not-allowed; opacity: 0.9; }

    .opt-a { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.4); }
    .opt-b { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.4); }
    .opt-c { background: rgba(234,179,8,0.15); border-color: rgba(234,179,8,0.4); }
    .opt-d { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.4); }

    .ans-letter {
      width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: 1.1rem; flex-shrink: 0;
      background: rgba(255,255,255,0.2); box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .ans-text { flex: 1; line-height: 1.3; }

    .answered-msg { display: flex; flex-direction: column; gap: 1.5rem; align-items: center; justify-content: center; flex: 1; animation: slideUp 0.3s ease-out; }
    .ans-selected {
      display: flex; align-items: center; gap: 1rem;
      padding: 1.5rem; border-radius: 20px; border: 3px solid;
      width: 100%; font-size: 1.2rem; font-weight: 700;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .wait-reveal { text-align: center; color: rgba(255,255,255,0.7); font-size: 1.1rem; margin-top: 1rem; animation: pulse 2s infinite alternate; }
    .no-answer-msg { text-align: center; padding: 3rem 1rem; flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .timeout-emoji { font-size: 4rem; display: block; margin-bottom: 1rem; animation: bounce 1s infinite; }

    /* REVEAL */
    .reveal-screen { display: flex; flex-direction: column; gap: 1.5rem; padding: 1rem 0; animation: slideUp 0.4s ease-out; }

    .reveal-result {
      text-align: center; padding: 2.5rem 1.5rem; border-radius: 24px;
      border: 3px solid rgba(255,255,255,0.1);
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    .correct-result { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.5); }
    .wrong-result { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.5); }
    .timeout-result { background: rgba(107,114,128,0.15); border-color: rgba(107,114,128,0.5); }

    .result-emoji { font-size: 5rem; display: block; margin-bottom: 1rem; animation: bounce 1s cubic-bezier(0.28, 0.84, 0.42, 1); }
    .result-text { font-size: 2.5rem; font-weight: 900; }
    .pts-earned { color: #22c55e; font-size: 1.5rem; font-weight: 800; margin-top: 0.5rem; }

    .correct-answer-box { display: flex; flex-direction: column; gap: 0.5rem; background: rgba(255,255,255,0.03); padding: 1.25rem; border-radius: 20px; }
    .ca-label { font-size: 1rem; color: rgba(255,255,255,0.7); font-weight: 600; }
    .ca-value {
      display: flex; align-items: center; gap: 1rem;
      padding: 1rem 1.25rem; border-radius: 16px; border: 2px solid;
      font-size: 1.1rem; font-weight: 700;
    }

    .my-score-box {
      display: flex; justify-content: space-between; align-items: center;
      background: linear-gradient(135deg, rgba(168,85,247,0.15), rgba(6,182,212,0.15)); 
      border: 2px solid rgba(168,85,247,0.4);
      border-radius: 20px; padding: 1.5rem;
      box-shadow: 0 8px 20px rgba(168,85,247,0.2);
    }
    .score-label { color: rgba(255,255,255,0.9); font-size: 1.1rem; font-weight: 600; }
    .score-value { font-size: 2.2rem; font-weight: 900; color: #fff; text-shadow: 0 0 10px #a855f7; }

    .mini-ranking { background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 20px; }
    .mini-ranking h3 { font-size: 1.2rem; color: rgba(255,255,255,0.8); margin-bottom: 1rem; text-align: center; }
    .rank-row {
      display: flex; align-items: center; gap: 1rem;
      background: rgba(255,255,255,0.05); border-radius: 12px; padding: 0.75rem 1rem; margin-bottom: 0.5rem;
    }
    .is-me-row { background: rgba(168,85,247,0.2); border: 2px solid rgba(168,85,247,0.5); box-shadow: 0 0 15px rgba(168,85,247,0.3); transform: scale(1.02); }
    .rk-pos { width: 30px; font-weight: 900; text-align: center; font-size: 1.1rem; }
    .rk-av { width: 36px; height: 36px; border-radius: 50%; }
    .rk-name { flex: 1; font-size: 1rem; font-weight: 600; }
    .rk-pts { font-weight: 900; color: #a855f7; font-size: 1.1rem; }

    /* FINISHED */
    .finished-screen { display: flex; flex-direction: column; gap: 2rem; align-items: center; padding: 2rem 0; animation: slideUp 0.5s ease-out; }
    .fin-title { font-size: 2.2rem; font-weight: 900; text-align: center; background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

    .my-final-pos { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; background: rgba(255,255,255,0.03); padding: 2rem; border-radius: 24px; width: 100%; border: 1px solid rgba(255,255,255,0.1); }
    .pos-number {
      font-size: 4.5rem; font-weight: 900;
      background: rgba(255,255,255,0.1); border-radius: 50%;
      width: 110px; height: 110px; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3); margin-bottom: 0.5rem;
    }
    .pos-number.gold { background: linear-gradient(135deg, rgba(251,191,36,0.3), rgba(245,158,11,0.3)); color: #fbbf24; border: 2px solid #fbbf24; box-shadow: 0 0 30px rgba(251,191,36,0.4); }
    .pos-number.silver { background: linear-gradient(135deg, rgba(148,163,184,0.3), rgba(100,116,139,0.3)); color: #94a3b8; border: 2px solid #94a3b8; }
    .pos-number.bronze { background: linear-gradient(135deg, rgba(205,127,50,0.3), rgba(161,98,7,0.3)); color: #cd7f32; border: 2px solid #cd7f32; }
    .final-avatar { width: 80px; height: 80px; border-radius: 50%; border: 4px solid #a855f7; }
    .my-final-name { font-size: 1.5rem; font-weight: 800; }
    .my-final-score { font-size: 2rem; font-weight: 900; color: #a855f7; }
    .my-stats { color: rgba(255,255,255,0.8); font-size: 1.1rem; font-weight: 600; background: rgba(0,0,0,0.2); padding: 0.5rem 1rem; border-radius: 12px; }

    .final-ranking { width: 100%; background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 24px; }
    .fk-row {
      display: flex; align-items: center; gap: 0.75rem;
      background: rgba(255,255,255,0.04); border-radius: 16px; padding: 0.75rem 1rem; margin-bottom: 0.5rem;
    }
    .fk-me { background: rgba(168,85,247,0.2); border: 2px solid rgba(168,85,247,0.5); transform: scale(1.02); box-shadow: 0 5px 15px rgba(168,85,247,0.2); }
    .fk-pos { width: 40px; text-align: center; font-size: 1.4rem; font-weight: 900; }
    .fk-gold { color: #fbbf24; text-shadow: 0 0 10px rgba(251,191,36,0.5); }
    .fk-silver { color: #94a3b8; }
    .fk-bronze { color: #cd7f32; }
    .fk-av { width: 40px; height: 40px; border-radius: 50%; }
    .fk-name { flex: 1; font-size: 1rem; font-weight: 700; }
    .fk-correct { color: #22c55e; font-size: 0.95rem; font-weight: 700; }
    .fk-wrong { color: #f87171; font-size: 0.95rem; font-weight: 700; }
    .fk-score { font-weight: 900; color: #a855f7; font-size: 1.1rem; margin-left: 0.5rem; }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  `]
})
export class TriviaPlayerComponent implements OnInit, OnDestroy {
  phase: GamePhase = 'lobby';
  connecting = true;
  roomId = '';

  availableParticipants: { name: string; avatar: string }[] = [];
  joinedPlayers: TriviaPlayer[] = [];
  currentQ: TriviaQuestion | null = null;
  qIndex = 0;
  totalQ = 0;
  secondsLeft = 0;
  revealData: RevealData | null = null;
  roundWinner: any = null;
  rankings: TriviaPlayer[] = [];
  sortedPlayers: TriviaPlayer[] = [];

  myName = '';
  myAvatar = '';
  myAnswer = '';

  private subs: Subscription[] = [];

  get timerPercent() { return (this.secondsLeft / (this.triviaService.timeLimit || 20)) * 100; }

  get isCorrect() { return !!this.myAnswer && this.myAnswer === this.revealData?.correctId; }

  get isFastestWinner() {
    return this.isCorrect && this.roundWinner?.name === this.myName;
  }

  get pointsEarned() {
    if (!this.isCorrect) return 0;
    if (this.isFastestWinner) return this.roundWinner?.pointsGained || 100;
    return 50;
  }

  get myScore() {
    return this.joinedPlayers.find(p => p.name === this.myName)?.score ?? 0;
  }

  get myCorrect() {
    return this.joinedPlayers.find(p => p.name === this.myName)?.correctCount ?? 0;
  }

  get myWrong() {
    return this.joinedPlayers.find(p => p.name === this.myName)?.wrongCount ?? 0;
  }

  get myPosition() {
    const idx = this.rankings.findIndex(p => p.name === this.myName);
    return idx >= 0 ? idx + 1 : 0;
  }

  constructor(
    public triviaService: TriviaService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.roomId = this.route.snapshot.queryParamMap.get('room') || '';
    if (!this.roomId) {
      this.triviaService.errorMsg$.next('No se especificó sala. Escanea el QR nuevamente.');
      this.triviaService.phase$.next('error');
      this.connecting = false;
      return;
    }

    this.subs.push(
      this.triviaService.phase$.subscribe(p => {
        this.phase = p;
        // Reset answer on new question
        if (p === 'question') this.myAnswer = '';
        this.cdr.markForCheck();
      }),
      this.triviaService.players$.subscribe(p => {
        this.joinedPlayers = p;
        this.sortedPlayers = [...p].sort((a, b) => b.score - a.score);
        this.cdr.markForCheck();
      }),
      this.triviaService.currentQuestion$.subscribe(q => { this.currentQ = q; this.cdr.markForCheck(); }),
      this.triviaService.questionIndex$.subscribe(i => { this.qIndex = i; this.cdr.markForCheck(); }),
      this.triviaService.totalQuestions$.subscribe(t => { this.totalQ = t; this.cdr.markForCheck(); }),
      this.triviaService.secondsLeft$.subscribe(s => { this.secondsLeft = s; this.cdr.markForCheck(); }),
      this.triviaService.revealData$.subscribe(r => { this.revealData = r; this.cdr.markForCheck(); }),
      this.triviaService.roundWinner$.subscribe(w => { this.roundWinner = w; this.cdr.markForCheck(); }),
      this.triviaService.rankings$.subscribe(r => { this.rankings = r; this.cdr.markForCheck(); }),

      // Get participants list from room-info message
      this.triviaService.message$.subscribe(msg => {
        if (msg.type === 'room-info' && msg.participants) {
          this.availableParticipants = msg.participants;
          this.cdr.markForCheck();
        }
      })
    );

    try {
      await this.triviaService.joinRoom(this.roomId);
      this.availableParticipants = this.triviaService.availableParticipants || [];
      this.connecting = false;
      this.cdr.markForCheck();
    } catch {
      this.connecting = false;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    if (!this.triviaService.isHost) this.triviaService.reset();
  }

  selectMe(p: { name: string; avatar: string }) {
    this.myName = p.name;
    this.myAvatar = p.avatar;
    this.triviaService.myName = p.name;
    this.triviaService.myAvatar = p.avatar;
    this.triviaService.sendJoin();
  }

  isTaken(name: string) {
    return this.joinedPlayers.some(p => p.name === name);
  }

  answer(optId: string) {
    if (this.myAnswer || this.secondsLeft <= 0) return;
    this.myAnswer = optId;
    this.triviaService.submitAnswer(optId);
  }

  getOptionText(id: string): string {
    return this.currentQ?.options.find(o => o.id === id)?.text || '';
  }

  onImgErr(e: any, p: any) {
    e.target.src = 'https://api.dicebear.com/7.x/pixel-art/png?seed=' + encodeURIComponent(p.name || 'user');
  }

  onSelfImgErr(e: any) {
    e.target.src = 'https://api.dicebear.com/7.x/pixel-art/png?seed=' + encodeURIComponent(this.myName);
  }

  goBack() {
    this.triviaService.reset();
    this.router.navigate(['/']);
  }
}

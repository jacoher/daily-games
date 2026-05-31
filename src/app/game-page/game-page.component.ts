import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ParticipantService } from '../participant.service';
import { RouletteComponent } from '../roulette/roulette.component';
import { Participant } from '../participant.model';

@Component({
  selector: 'app-game-page',
  standalone: true,
  imports: [CommonModule, RouletteComponent, FormsModule],
  template: `
    <div class="game-container animate-in">
      <header class="game-header">
        <button class="glass-button ghost back-btn" (click)="goBack()">
          <span>⬅️</span> <span class="btn-text">Volver</span>
        </button>
        <h1 class="main-title">🌌 Ruleta Cósmica</h1>
        <div class="header-spacer"></div>
      </header>
      
      <div class="roulette-wrapper animate-scale">
        <app-roulette 
          [items]="activeParticipants" 
          [speedMultiplier]="participantService.speedMultiplier"
          (winnerSelected)="onWinnerSelected($event)">
        </app-roulette>
      </div>

      <div class="config-section glass-panel">
        <label>🛸 Velocidad de Giro: {{ getSpeedLabel() }}</label>
        <input type="range" min="0.5" max="2" step="0.1" [(ngModel)]="participantService.speedMultiplier">
      </div>

      <div class="rocket" [class.launch]="showRocket">🚀</div>
    </div>

    <!-- Interactive Winner Modal -->
    <div class="winner-modal-backdrop" *ngIf="winner">
      <div class="winner-modal glass-panel">
        <h2 class="winner-title">🎉 ¡TENEMOS GANADOR! 🎉</h2>
        
        <div class="winner-profile">
          <img [src]="winner.avatarUrl" (error)="handleImageError($event, winner)" class="winner-avatar" />
          <div class="winner-name">{{ winner.name }}</div>
        </div>
        
        <p class="winner-prompt">¿Qué deseas hacer con el ganador?</p>
        
        <div class="winner-actions">
          <button class="glass-button action-btn" (click)="continuar()">
            Continuar <br><small>(Mantener en la ruleta)</small>
          </button>
          <button class="glass-button action-btn danger" (click)="eliminarGanador()">
            Quitar de la ruleta <br><small>(Solo por esta partida)</small>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .game-container {
      position: relative;
      width: 100%;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      min-height: calc(100dvh - 2rem);
      padding: 0 1rem var(--safe-bottom) 1rem;
      box-sizing: border-box;
    }
    .game-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: 800px;
      padding: clamp(0.5rem, 2vw, 1.2rem) 0;
      gap: 15px;
      box-sizing: border-box;
    }
    .main-title {
      font-size: clamp(1.8rem, 5vw, 2.8rem);
      font-weight: 900;
      margin: 0;
      text-align: center;
      text-shadow: 0 0 20px rgba(139, 92, 246, 0.6);
      background: linear-gradient(to right, #fbbf24, #ec4899, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      flex-grow: 1;
    }
    .back-btn {
      flex-shrink: 0;
      font-size: 0.95rem;
      padding: 0.6rem 1.2rem;
    }
    .header-spacer {
      width: 105px;
      flex-shrink: 0;
    }
    
    @media (max-width: 600px) {
      .game-header {
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding-bottom: 0.5rem;
      }
      .header-spacer {
        display: none;
      }
      .back-btn {
        width: 100%;
        max-width: 150px;
        order: 2;
      }
      .main-title {
        order: 1;
        font-size: clamp(1.6rem, 6vw, 2.2rem);
      }
      .btn-text {
        display: inline;
      }
    }
    
    .roulette-wrapper {
      width: 100%;
      max-width: 700px;
      padding: 0;
      box-sizing: border-box;
      display: flex;
      justify-content: center;
    }
    .config-section {
      margin-top: 1.5rem;
      margin-bottom: 2rem;
      padding: clamp(0.8rem, 3vw, 1.2rem);
      width: 100%;
      max-width: 400px;
      text-align: center;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .config-section label {
      font-size: 1rem;
      font-weight: 600;
      color: #e2e8f0;
    }
    .config-section input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.1);
      outline: none;
      cursor: pointer;
    }
    .config-section input[type="range"]::-webkit-slider-runnable-track {
      width: 100%;
      height: 6px;
      background: linear-gradient(90deg, var(--purple) 0%, var(--cyan) 100%);
      border-radius: 3px;
    }
    .config-section input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 0 8px rgba(139, 92, 246, 0.8);
      margin-top: -6px;
      transition: transform 0.15s, background-color 0.15s;
    }
    .config-section input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.3);
      background: var(--amber);
    }
    .config-section input[type="range"]::-moz-range-track {
      width: 100%;
      height: 6px;
      background: linear-gradient(90deg, var(--purple) 0%, var(--cyan) 100%);
      border-radius: 3px;
    }
    .config-section input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      border: none;
      box-shadow: 0 0 8px rgba(139, 92, 246, 0.8);
      transition: transform 0.15s, background-color 0.15s;
    }
    .config-section input[type="range"]::-moz-range-thumb:hover {
      transform: scale(1.3);
      background: var(--amber);
    }
    
    .winner-modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(15px);
      animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .winner-modal {
      width: 90%;
      max-width: 460px;
      text-align: center;
      padding: clamp(2rem, 6vw, 3rem) clamp(1.2rem, 4vw, 2.2rem);
      border: 2px solid rgba(168, 85, 247, 0.5);
      box-shadow: 0 20px 60px rgba(168, 85, 247, 0.3),
                  inset 0 0 20px rgba(168, 85, 247, 0.15);
      animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes popIn {
      0% { transform: scale(0.85); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .winner-title {
      font-size: clamp(1.5rem, 5vw, 2.2rem);
      margin-bottom: 1.5rem;
      color: #fbbf24;
      text-shadow: 0 0 15px rgba(251, 191, 36, 0.8);
      font-weight: 900;
    }
    .winner-profile {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1.8rem;
    }
    .winner-avatar {
      width: clamp(100px, 25vw, 130px);
      height: clamp(100px, 25vw, 130px);
      border-radius: 50%;
      border: 4px solid var(--purple);
      background: #111;
      box-shadow: 0 0 25px rgba(168, 85, 247, 0.5);
      margin-bottom: 1rem;
      transition: transform 0.3s ease;
    }
    .winner-avatar:hover {
      transform: scale(1.05) rotate(5deg);
    }
    .winner-name {
      font-size: clamp(2rem, 7vw, 3.2rem);
      font-weight: 900;
      line-height: 1.1;
      word-break: break-word;
      background: linear-gradient(135deg, #fbbf24 0%, #ec4899 50%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
    }

    .winner-prompt {
      font-size: clamp(0.95rem, 3vw, 1.1rem);
      margin-bottom: 1.5rem;
      color: #cbd5e1;
    }
    .winner-actions {
      display: flex;
      gap: 0.85rem;
      justify-content: center;
      width: 100%;
    }
    .action-btn {
      flex: 1;
      font-size: clamp(0.9rem, 2.5vw, 1rem);
      padding: clamp(0.75rem, 2vw, 1rem) 0.5rem;
      border-radius: 20px;
      line-height: 1.3;
      white-space: normal;
    }
    .action-btn small {
      display: block;
      font-size: clamp(0.65rem, 1.8vw, 0.75rem);
      opacity: 0.8;
      margin-top: 3px;
      font-weight: normal;
    }
    
    @media (max-width: 480px) {
      .winner-actions {
        flex-direction: column;
        gap: 0.75rem;
      }
      .action-btn {
        width: 100%;
      }
    }

    /* Rocket Animation */
    .rocket {
      position: fixed;
      bottom: -100px;
      left: -100px;
      font-size: 100px;
      z-index: 9999;
      opacity: 0;
      pointer-events: none;
    }
    .rocket.launch {
      animation: flyUp 3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      opacity: 1;
    }
    @keyframes flyUp {
      0% { transform: translate(0, 0) rotate(45deg); opacity: 1; }
      100% { transform: translate(120vw, -120vh) rotate(45deg); opacity: 1; }
    }
  `]
})
export class GamePageComponent implements OnInit {
  winner: Participant | null = null;
  showRocket = false;
  activeParticipants: Participant[] = [];

  constructor(public participantService: ParticipantService, private router: Router) {}

  ngOnInit() {
    this.activeParticipants = [...this.participantService.participants];
    if (this.activeParticipants.length === 0) {
      this.router.navigate(['/']);
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }

  getSpeedLabel() {
    if (this.participantService.speedMultiplier < 0.8) return 'Rápida 🚀';
    if (this.participantService.speedMultiplier > 1.2) return 'Lenta 🐢';
    return 'Normal 🛸';
  }

  onWinnerSelected(winner: Participant) {
    this.winner = winner;
    // Trigger Rocket!
    this.showRocket = false;
    setTimeout(() => this.showRocket = true, 50);
  }

  continuar() {
    this.winner = null;
    this.showRocket = false;
  }

  eliminarGanador() {
    if (this.winner) {
      // Remove only from local active list, keep in database/service
      this.activeParticipants = this.activeParticipants.filter(p => p.name !== this.winner!.name);
    }
    this.winner = null;
    this.showRocket = false;
  }

  handleImageError(event: any, participant: any) {
    if (event && event.target && participant) {
      event.target.src = 'https://api.dicebear.com/7.x/pixel-art/png?seed=' + encodeURIComponent(participant.name);
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ParticipantService } from '../participant.service';
import { RouletteComponent } from '../roulette/roulette.component';
import { Participant } from '../participant.model';

@Component({
  selector: 'app-game-page',
  standalone: true,
  imports: [CommonModule, RouletteComponent],
  template: `
    <div class="game-container">
      <h1 class="main-title">🌌 Ruleta Cósmica <span class="version">v1.0</span> 🌌</h1>
      <button class="glass-button back-btn" (click)="goBack()">⬅️ Volver</button>
      
      <div class="roulette-wrapper">
        <app-roulette 
          [items]="activeParticipants" 
          [speedMultiplier]="participantService.speedMultiplier"
          (winnerSelected)="onWinnerSelected($event)">
        </app-roulette>
      </div>

      <!-- Interactive Winner Modal -->
      <div class="winner-modal-backdrop" *ngIf="winner">
        <div class="winner-modal glass-panel">
          <h2 class="winner-title">🎉 ¡TENEMOS GANADOR! 🎉</h2>
          
          <div class="winner-profile">
            <img [src]="winner.avatarUrl" class="winner-avatar" />
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

      <div class="rocket" [class.launch]="showRocket">🚀</div>
    </div>
  `,
  styles: [`
    .game-container {
      position: relative;
      width: 100vw;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      justify-content: flex-start;
      margin-top: 2rem;
    }
    .main-title {
      font-size: clamp(2rem, 8vw, 3.5rem);
      font-weight: 800;
      margin-bottom: 2rem;
      text-align: center;
      text-shadow: 0 0 20px rgba(139, 92, 246, 0.8);
      background: linear-gradient(to right, #a855f7, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
    }
    .version {
      font-size: 1.2rem;
      background: rgba(251, 191, 36, 0.15);
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.5);
      -webkit-text-fill-color: #fbbf24;
      text-shadow: none;
      letter-spacing: 1px;
    }
    .back-btn {
      position: absolute;
      top: 0px;
      left: 20px;
      z-index: 50;
    }
    .roulette-wrapper {
      margin-top: 2rem;
      width: 100%;
      max-width: 630px;
      padding: 0 1rem;
      box-sizing: border-box;
    }
    
    .winner-modal-backdrop {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .winner-modal {
      width: 90%;
      max-width: 500px;
      text-align: center;
      padding: 3rem 2rem;
      border: 2px solid rgba(139, 92, 246, 0.8);
      box-shadow: 0 0 50px rgba(139, 92, 246, 0.5);
      animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes popIn {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .winner-title {
      font-size: 2.5rem;
      margin-bottom: 2rem;
      color: #fbbf24;
      text-shadow: 0 0 15px rgba(251, 191, 36, 0.8);
    }
    .winner-profile {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 2rem;
    }
    .winner-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 4px solid white;
      background: white;
      box-shadow: 0 0 20px rgba(255,255,255,0.5);
      margin-bottom: 1rem;
    }
    .winner-name {
      font-size: 3rem;
      font-weight: 800;
      background: linear-gradient(to right, #a855f7, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .winner-prompt {
      font-size: 1.2rem;
      margin-bottom: 1.5rem;
      opacity: 0.9;
    }
    .winner-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }
    .action-btn {
      flex: 1;
      font-size: 1.1rem;
      padding: 1rem;
    }
    .action-btn small {
      display: block;
      font-size: 0.8rem;
      opacity: 0.7;
      margin-top: 5px;
      font-weight: normal;
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
}

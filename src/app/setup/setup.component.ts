import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ParticipantService } from '../participant.service';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="setup-container">
      <div class="sidebar glass-panel">
        <h2>Participantes</h2>
        
        <div class="input-group" style="flex-direction: column;">
          <input 
            type="text" 
            class="glass-input" 
            [(ngModel)]="newName" 
            placeholder="Añadir nombre..." 
          />
          <div style="display: flex; gap: 0.5rem; width: 100%;">
            <input 
              type="text" 
              class="glass-input" 
              [(ngModel)]="newAvatarUrl" 
              (keyup.enter)="addParticipant()"
              placeholder="URL avatar (opcional)..." 
              style="flex: 1;"
            />
            <button class="glass-button" (click)="addParticipant()">+</button>
          </div>
        </div>

        <div class="participants-list">
          <div *ngIf="participantService.participants.length === 0" class="empty-msg">
            No hay participantes. ¡Agrega algunos!
          </div>
          <div class="participant-item glass-panel" *ngFor="let p of participantService.participants; let i = index" style="padding: 0.5rem 1rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <img [src]="p.avatarUrl" width="30" height="30" style="border-radius: 50%; background: white;">
              <span>{{ p.name }}</span>
            </div>
            <button class="glass-button danger small" (click)="removeParticipant(i)">X</button>
          </div>
        </div>

        <div class="config-section">
          <h3>⚙️ Configuración</h3>
          <label>Velocidad de Giro: {{ getSpeedLabel() }}</label>
          <input type="range" min="0.5" max="2" step="0.1" [(ngModel)]="participantService.speedMultiplier" style="width: 100%;">
        </div>
      </div>
      
      <div class="action-section">
         <button class="glass-button play-btn" (click)="goToRoulette()" [disabled]="participantService.participants.length === 0">
           🚀 ¡IR A LA RULETA!
         </button>
         <p class="hint" *ngIf="participantService.participants.length === 0">Agrega al menos un participante para comenzar</p>
      </div>
    </div>
  `,
  styles: [`
    .setup-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
      width: 100%;
      max-width: 500px;
      margin: 0 auto;
    }
    .sidebar {
      width: 100%;
      display: flex;
      flex-direction: column;
      height: 60vh;
    }
    .sidebar h2 { margin-bottom: 1rem; font-size: 1.8rem; }
    .input-group { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .participants-list { flex: 1; overflow-y: auto; margin-bottom: 1rem; padding-right: 0.5rem; }
    .empty-msg { text-align: center; opacity: 0.7; margin-top: 2rem; font-style: italic; }
    .config-section { margin-top: auto; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem; }
    .config-section h3 { margin-bottom: 0.5rem; font-size: 1.2rem; }
    
    .action-section { width: 100%; text-align: center; }
    .play-btn {
      font-size: 1.5rem;
      padding: 1rem 3rem;
      border-radius: 40px;
      background: linear-gradient(135deg, #a855f7, #3b82f6);
      color: white;
      font-weight: 800;
      letter-spacing: 2px;
      width: 100%;
      transition: transform 0.2s, box-shadow 0.2s;
      border: none;
      cursor: pointer;
    }
    .play-btn:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 0 30px rgba(168, 85, 247, 0.6);
    }
    .play-btn:disabled { opacity: 0.5; cursor: not-allowed; background: #555; }
    .hint { margin-top: 1rem; opacity: 0.8; }
  `]
})
export class SetupComponent implements OnInit {
  newName = '';
  newAvatarUrl = '';

  constructor(public participantService: ParticipantService, private router: Router) {}

  ngOnInit() {
    this.participantService.loadParticipants();
  }

  getSpeedLabel() {
    if (this.participantService.speedMultiplier < 0.8) return 'Rápida 🚀';
    if (this.participantService.speedMultiplier > 1.2) return 'Lenta 🐢';
    return 'Normal 🛸';
  }

  addParticipant() {
    const name = this.newName.trim();
    const avatar = this.newAvatarUrl.trim() || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + encodeURIComponent(name);
    if (name) {
      this.participantService.addParticipant(name, avatar);
      this.newName = '';
      this.newAvatarUrl = '';
    }
  }

  removeParticipant(index: number) {
    this.participantService.removeParticipant(index);
  }

  goToRoulette() {
    if (this.participantService.participants.length > 0) {
      this.router.navigate(['/roulette']);
    }
  }
}

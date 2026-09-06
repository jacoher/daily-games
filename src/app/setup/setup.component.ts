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
    <div class="setup-container animate-in">
      <div class="title-wrap">
        <h1 class="main-title">
          <span class="emoji-spin">🌌</span> 
          Daily Games 
          <span class="version">v1.0</span>
        </h1>
        <p class="subtitle">Agrega jugadores y elige un minijuego</p>
      </div>
      
      <div class="content-grid">
        <!-- ════════ PARTICIPANTS PANEL ════════ -->
        <div class="sidebar glass-panel">
          <div class="panel-header">
            <h2>👥 Participantes</h2>
            <span class="count-badge">{{ participantService.participants.length }}</span>
          </div>
          
          <div class="input-group">
            <input 
              type="text" 
              class="glass-input big-input" 
              [(ngModel)]="newName" 
              (keyup.enter)="addParticipant()"
              placeholder="Escribe un nombre..." 
            />
            <div class="sub-input-row">
              <input 
                type="text" 
                class="glass-input sm-input" 
                [(ngModel)]="newAvatarUrl" 
                (keyup.enter)="addParticipant()"
                placeholder="URL de avatar (opcional)" 
              />
              <button class="glass-button add-btn" (click)="addParticipant()" [disabled]="!newName.trim()">
                Añadir
              </button>
            </div>
          </div>

          <div class="participants-list">
            <div *ngIf="participantService.participants.length === 0" class="empty-msg">
              <span class="empty-icon">👻</span>
              <p>Sala vacía. ¡Agrega al primer jugador!</p>
            </div>
            
            <div class="participant-item" *ngFor="let p of participantService.participants; let i = index">
              <div class="p-info">
                <img [src]="p.avatarUrl" class="p-avatar" (error)="handleImageError($event, p)">
                <span class="p-name">{{ p.name }}</span>
              </div>
              <button class="glass-button danger ghost p-remove" (click)="removeParticipant(i)" title="Eliminar">
                🗑️
              </button>
            </div>
          </div>
        </div>
        
        <!-- ════════ GAMES PANEL ════════ -->
        <div class="action-section">
           <button class="game-card roulette-card" (click)="goToRoulette()" [class.disabled-card]="participantService.participants.length === 0">
             <div class="card-icon">🚀</div>
             <div class="card-content">
               <h3>La Ruleta</h3>
               <p>Sorteos y castigos al azar</p>
             </div>
           </button>

           <button class="game-card marble-card" (click)="goToMarbles()" [class.disabled-card]="participantService.participants.length === 0">
             <div class="card-icon">🏁</div>
             <div class="card-content">
               <h3>Marble Race</h3>
               <p>Carrera de canicas épica</p>
             </div>
           </button>

           <button class="game-card slot-card" (click)="goToSlots()" [class.disabled-card]="participantService.participants.length === 0">
             <div class="card-icon">🎰</div>
             <div class="card-content">
               <h3>Casino Slots</h3>
               <p>Palanca mecánica y jackpot</p>
             </div>
           </button>

           <button class="game-card trivia-card" (click)="goToTrivia()" [class.disabled-card]="participantService.participants.length === 0">
             <div class="card-icon">🧠</div>
             <div class="card-content">
               <h3>Trivia IA</h3>
               <p>Demuestra tu conocimiento</p>
             </div>
           </button>
           
           <div class="hint-box" *ngIf="participantService.participants.length === 0">
              ⚠️ Agrega jugadores para desbloquear los juegos
           </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .setup-container {
      display: flex; flex-direction: column; align-items: center; gap: 2rem;
      width: 100%; max-width: 1000px; margin: 0 auto;
    }

    .title-wrap { text-align: center; margin-bottom: 1rem; }
    .main-title {
      font-size: clamp(2.2rem, 6vw, 4rem); font-weight: 900;
      background: linear-gradient(to right, #a855f7, #06b6d4, #a855f7);
      background-size: 200% auto;
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      animation: shimmer 5s linear infinite;
      display: flex; align-items: center; justify-content: center; gap: 1rem;
    }
    .emoji-spin { display: inline-block; -webkit-text-fill-color: initial; animation: spin 20s linear infinite; }
    .subtitle { color: rgba(255,255,255,0.7); font-size: 1.1rem; margin-top: 0.5rem; letter-spacing: 1px; }
    
    .version {
      font-size: 1rem; background: rgba(168,85,247,0.15);
      padding: 0.3rem 0.8rem; border-radius: 20px; border: 1px solid rgba(168,85,247,0.4);
      -webkit-text-fill-color: #c084fc; letter-spacing: 1px; vertical-align: middle;
    }

    .content-grid {
      display: grid; grid-template-columns: 1fr; gap: 2rem; width: 100%;
    }
    @media (min-width: 800px) {
      .content-grid { grid-template-columns: 1.2fr 1fr; align-items: start; }
    }

    /* Sidebar / Participants */
    .sidebar { display: flex; flex-direction: column; height: 600px; max-height: 70vh; padding: 2rem; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
    .panel-header h2 { font-size: 1.5rem; font-weight: 800; }
    .count-badge { background: #a855f7; color: #fff; padding: 0.2rem 0.8rem; border-radius: 20px; font-weight: 800; font-size: 1rem; }

    .input-group { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
    .big-input { font-size: 1.1rem; padding: 1rem; border-radius: 16px; background: rgba(0,0,0,0.2); }
    .sub-input-row { display: flex; gap: 0.5rem; }
    .sm-input { flex: 1; font-size: 0.9rem; }
    .add-btn { border-radius: 12px; padding: 0 1.5rem; }

    .participants-list { flex: 1; overflow-y: auto; padding-right: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .empty-msg { text-align: center; color: rgba(255,255,255,0.5); display: flex; flex-direction: column; gap: 0.5rem; margin-top: 3rem; }
    .empty-icon { font-size: 3rem; animation: bounce 2s infinite; }
    
    .participant-item {
      display: flex; justify-content: space-between; align-items: center;
      background: rgba(255,255,255,0.05); padding: 0.6rem 1rem; border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s;
    }
    .participant-item:hover { background: rgba(255,255,255,0.1); transform: translateX(5px); border-color: rgba(168,85,247,0.3); }
    .p-info { display: flex; align-items: center; gap: 12px; }
    .p-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); background: #fff; }
    .p-name { font-weight: 600; font-size: 1.05rem; }
    .p-remove { padding: 0.4rem; font-size: 1.1rem; border-radius: 10px; background: transparent; }
    .p-remove:hover { background: rgba(244,63,94,0.2); transform: scale(1.1); }

    /* Action Section / Games */
    .action-section { display: flex; flex-direction: column; gap: 1rem; }
    
    .game-card {
      display: flex; align-items: center; gap: 1.5rem; text-align: left;
      padding: 1.5rem; border-radius: 24px; border: none; cursor: pointer;
      color: #fff; text-decoration: none; font-family: 'Outfit', sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative; overflow: hidden;
    }
    .game-card::before {
      content: ''; position: absolute; inset: 0; background: linear-gradient(rgba(255,255,255,0.2), transparent); opacity: 0; transition: opacity 0.3s;
    }
    .game-card:hover:not(.disabled-card) { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.4); }
    .game-card:hover:not(.disabled-card)::before { opacity: 1; }
    .game-card:active:not(.disabled-card) { transform: translateY(0); }
    
    .disabled-card { opacity: 0.4; cursor: not-allowed; filter: grayscale(100%); }

    .roulette-card { background: linear-gradient(135deg, #3b82f6, #8b5cf6); box-shadow: 0 8px 25px rgba(59,130,246,0.3); }
    .marble-card { background: linear-gradient(135deg, #f43f5e, #f97316); box-shadow: 0 8px 25px rgba(244,63,94,0.3); }
    .slot-card { background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 8px 25px rgba(245,158,11,0.35); }
    .trivia-card { background: linear-gradient(135deg, #06b6d4, #a855f7); box-shadow: 0 8px 25px rgba(6,182,212,0.3); }

    .card-icon { font-size: 3rem; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
    .card-content h3 { font-size: 1.6rem; font-weight: 800; margin-bottom: 0.2rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
    .card-content p { font-size: 0.95rem; color: rgba(255,255,255,0.9); font-weight: 500; }

    .hint-box {
      background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.4);
      color: #fbbf24; padding: 1rem; border-radius: 16px; text-align: center;
      font-weight: 600; font-size: 0.95rem; margin-top: 0.5rem;
      animation: pulse 2s infinite alternate;
    }
  `]
})
export class SetupComponent implements OnInit {
  newName = '';
  newAvatarUrl = '';

  constructor(public participantService: ParticipantService, private router: Router) { }

  ngOnInit() {
    this.participantService.loadParticipants();
  }



  addParticipant() {
    const name = this.newName.trim();
    const avatar = this.newAvatarUrl.trim() || 'https://api.dicebear.com/7.x/pixel-art/png?seed=' + encodeURIComponent(name);
    if (name) {
      this.participantService.addParticipant(name, avatar);
      this.newName = '';
      this.newAvatarUrl = '';
    }
  }

  handleImageError(event: any, p: any) {
    if (event && event.target) {
      event.target.src = 'https://api.dicebear.com/7.x/pixel-art/png?seed=' + encodeURIComponent(p.name);
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

  goToMarbles() {
    if (this.participantService.participants.length > 0) {
      this.router.navigate(['/marbles']);
    }
  }

  goToSlots() {
    if (this.participantService.participants.length > 0) {
      this.router.navigate(['/slots']);
    }
  }

  goToTrivia() {
    if (this.participantService.participants.length > 0) {
      this.router.navigate(['/trivia']);
    }
  }
}

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
        <div class="badge-pill">⚡ Potencia tu Daily Scrum</div>
        <h1 class="main-title">
          <span class="brand-glow">Daily Devs Tools</span> 
          <span class="version">2.0</span>
        </h1>
        <p class="subtitle">Agrega jugadores y elige una opción</p>
      </div>
      
      <div class="content-grid">
        <!-- ════════ PARTICIPANTS PANEL ════════ -->
        <div class="sidebar glass-panel">
          <div class="panel-header">
            <div class="panel-title-group">
              <span class="panel-icon">👥</span>
              <h2>Participantes</h2>
            </div>
            <span class="count-badge" [class.has-participants]="participantService.participants.length > 0">
              {{ participantService.participants.length }}
            </span>
          </div>
          
          <div class="input-group">
            <input 
              type="text" 
              class="glass-input big-input" 
              [(ngModel)]="newName" 
              (keyup.enter)="addParticipant()"
              placeholder="Nombre del participante..." 
            />
            <div class="sub-input-row">
              <input 
                type="text" 
                class="glass-input sm-input" 
                [(ngModel)]="newAvatarUrl" 
                (keyup.enter)="addParticipant()"
                placeholder="URL avatar (opcional)" 
              />
              <button class="glass-button add-btn" (click)="addParticipant()" [disabled]="!newName.trim()">
                <span>+</span> Añadir
              </button>
            </div>
          </div>

          <div class="participants-list">
            <div *ngIf="participantService.participants.length === 0" class="empty-msg">
              <span class="empty-icon">👥</span>
              <p>No hay participantes aún.<br><small>Ingresa nombres para desbloquear las actividades.</small></p>
            </div>
            
            <div class="participant-item" *ngFor="let p of participantService.participants; let i = index">
              <div class="p-info">
                <img [src]="p.avatarUrl" class="p-avatar" (error)="handleImageError($event, p)">
                <span class="p-name">{{ p.name }}</span>
              </div>
              <button class="glass-button danger ghost p-remove" (click)="removeParticipant(i)" title="Eliminar participante">
                🗑️
              </button>
            </div>
          </div>
        </div>
        
        <!-- ════════ ACTIVITIES PANEL ════════ -->
        <div class="action-section">
          <!-- Categoría: Juegos -->
          <div class="category-block">
            <div class="category-header">
              <span class="category-icon">🎮</span>
              <h3 class="category-title">Juegos</h3>
              <span class="category-badge">4 opciones</span>
            </div>
            <div class="category-cards category-grid">
              <button class="game-card roulette-card" (click)="goToRoulette()" [class.disabled-card]="participantService.participants.length === 0">
                <div class="card-icon">🚀</div>
                <div class="card-content">
                  <h3>La Ruleta</h3>
                  <p>Sorteos y turnos al azar</p>
                </div>
                <span class="card-arrow">➔</span>
              </button>

              <button class="game-card marble-card" (click)="goToMarbles()" [class.disabled-card]="participantService.participants.length === 0">
                <div class="card-icon">🏁</div>
                <div class="card-content">
                  <h3>Marble Race</h3>
                  <p>Carrera de canicas épica</p>
                </div>
                <span class="card-arrow">➔</span>
              </button>

              <button class="game-card slot-card" (click)="goToSlots()" [class.disabled-card]="participantService.participants.length === 0">
                <div class="card-icon">🎰</div>
                <div class="card-content">
                  <h3>Casino Slots</h3>
                  <p>Palanca mecánica y jackpot</p>
                </div>
                <span class="card-arrow">➔</span>
              </button>

              <button class="game-card trivia-card" (click)="goToTrivia()" [class.disabled-card]="participantService.participants.length === 0">
                <div class="card-icon">🧠</div>
                <div class="card-content">
                  <h3>Trivia IA</h3>
                  <p>Preguntas y conocimiento</p>
                </div>
                <span class="card-arrow">➔</span>
              </button>
            </div>
          </div>

          <!-- Categoría: Planeación -->
          <div class="category-block">
            <div class="category-header">
              <span class="category-icon">📊</span>
              <h3 class="category-title">Planeación</h3>
              <span class="category-badge feature">Multiplayer</span>
            </div>
            <div class="category-cards">
              <button class="game-card poker-card-btn" (click)="goToPoker()" [class.disabled-card]="participantService.participants.length === 0">
                <div class="card-icon">🃏</div>
                <div class="card-content">
                  <h3>Planning Poker</h3>
                  <p>Estimaciones ágiles, historias y duelos en tiempo real</p>
                </div>
                <span class="card-arrow">➔</span>
              </button>
            </div>
          </div>
          
          <div class="hint-box" *ngIf="participantService.participants.length === 0">
             👉 Agrega al menos 1 participante en la columna izquierda para comenzar
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .setup-container {
      display: flex; flex-direction: column; align-items: center; gap: 2.2rem;
      width: 100%; max-width: 1100px; margin: 0 auto; padding: 0.5rem 1rem 3rem;
    }

    .title-wrap { 
      text-align: center; 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      gap: 0.5rem; 
    }
    
    .badge-pill {
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 1px;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.35);
      padding: 0.3rem 0.9rem;
      border-radius: 999px;
      text-transform: uppercase;
      box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
    }

    .main-title {
      font-size: clamp(2.4rem, 6vw, 4.2rem); 
      font-weight: 900;
      display: flex; 
      align-items: center; 
      justify-content: center; 
      gap: 0.8rem;
      margin: 0;
      line-height: 1.1;
    }
    
    .brand-glow {
      background: linear-gradient(135deg, #a855f7 0%, #38bdf8 50%, #ec4899 100%);
      background-size: 200% auto;
      -webkit-background-clip: text; 
      -webkit-text-fill-color: transparent;
      animation: shimmer 6s linear infinite;
    }

    .subtitle { 
      color: rgba(255,255,255,0.75); 
      font-size: 1.15rem; 
      margin: 0; 
      letter-spacing: 0.5px; 
    }
    
    .version {
      font-size: 1.1rem; 
      font-weight: 800;
      background: linear-gradient(135deg, rgba(168,85,247,0.25), rgba(6,182,212,0.25));
      padding: 0.35rem 0.9rem; 
      border-radius: 999px; 
      border: 1px solid rgba(168,85,247,0.5);
      color: #38bdf8; 
      letter-spacing: 1px; 
      box-shadow: 0 0 20px rgba(168,85,247,0.3);
    }

    .content-grid {
      display: grid; 
      grid-template-columns: 1fr; 
      gap: 2rem; 
      width: 100%;
    }
    @media (min-width: 880px) {
      .content-grid { grid-template-columns: 1.05fr 1.35fr; align-items: start; }
    }

    /* Sidebar / Participants */
    .sidebar { 
      display: flex; 
      flex-direction: column; 
      height: 620px; 
      max-height: 75vh; 
      padding: 1.75rem; 
      box-shadow: 0 10px 40px rgba(0,0,0,0.45);
    }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
    .panel-title-group { display: flex; align-items: center; gap: 0.6rem; }
    .panel-icon { font-size: 1.5rem; }
    .panel-header h2 { font-size: 1.45rem; font-weight: 800; margin: 0; }
    .count-badge { 
      background: rgba(255,255,255,0.1); 
      color: rgba(255,255,255,0.7); 
      padding: 0.25rem 0.8rem; 
      border-radius: 20px; 
      font-weight: 800; 
      font-size: 0.95rem; 
      border: 1px solid rgba(255,255,255,0.15);
      transition: all 0.3s;
    }
    .count-badge.has-participants {
      background: linear-gradient(135deg, #a855f7, #3b82f6);
      color: #fff;
      border-color: rgba(255,255,255,0.3);
      box-shadow: 0 0 15px rgba(168,85,247,0.4);
    }

    .input-group { display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 1.25rem; }
    .big-input { font-size: 1.05rem; padding: 0.85rem 1rem; border-radius: 14px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); }
    .big-input:focus, .sm-input:focus { border-color: #a855f7; box-shadow: 0 0 15px rgba(168,85,247,0.3); }
    .sub-input-row { display: flex; gap: 0.5rem; }
    .sm-input { flex: 1; font-size: 0.85rem; padding: 0.65rem 0.85rem; border-radius: 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.12); }
    .add-btn { 
      border-radius: 12px; 
      padding: 0 1.2rem; 
      font-weight: 700;
      background: linear-gradient(135deg, rgba(168,85,247,0.35), rgba(6,182,212,0.35));
      border: 1px solid rgba(168,85,247,0.5);
    }
    .add-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #a855f7, #06b6d4);
      box-shadow: 0 0 20px rgba(168,85,247,0.5);
    }

    .participants-list { flex: 1; overflow-y: auto; padding-right: 0.4rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .empty-msg { text-align: center; color: rgba(255,255,255,0.5); display: flex; flex-direction: column; gap: 0.5rem; margin-top: 3.5rem; }
    .empty-icon { font-size: 2.8rem; opacity: 0.7; }
    .empty-msg small { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
    
    .participant-item {
      display: flex; justify-content: space-between; align-items: center;
      background: rgba(255,255,255,0.05); padding: 0.55rem 0.9rem; border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.08); transition: all 0.2s;
    }
    .participant-item:hover { background: rgba(255,255,255,0.1); transform: translateX(4px); border-color: rgba(168,85,247,0.4); }
    .p-info { display: flex; align-items: center; gap: 10px; }
    .p-avatar { width: 34px; height: 34px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.25); background: #fff; }
    .p-name { font-weight: 600; font-size: 1rem; color: #f1f5f9; }
    .p-remove { padding: 0.35rem 0.5rem; font-size: 0.95rem; border-radius: 8px; background: transparent; }
    .p-remove:hover { background: rgba(244,63,94,0.25); color: #f43f5e; transform: scale(1.1); }

    /* Action Section / Categories */
    .action-section { display: flex; flex-direction: column; gap: 1.6rem; }

    .category-block { display: flex; flex-direction: column; gap: 0.85rem; }
    .category-header { display: flex; align-items: center; gap: 0.6rem; }
    .category-icon { font-size: 1.25rem; }
    .category-title {
      font-size: 1.05rem; font-weight: 800; color: rgba(255,255,255,0.9);
      text-transform: uppercase; letter-spacing: 1.2px; margin: 0;
    }
    .category-badge {
      font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.6);
      background: rgba(255,255,255,0.08); padding: 0.15rem 0.5rem; border-radius: 999px;
      margin-left: auto;
    }
    .category-badge.feature {
      color: #38bdf8; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3);
    }
    
    .category-cards { display: flex; flex-direction: column; gap: 0.9rem; }
    .category-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.85rem;
    }
    @media (min-width: 600px) {
      .category-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    .game-card {
      display: flex; align-items: center; gap: 1.1rem; text-align: left;
      padding: 1.15rem 1.3rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.12); cursor: pointer;
      color: #fff; text-decoration: none; font-family: 'Outfit', sans-serif;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative; overflow: hidden;
    }
    .game-card::before {
      content: ''; position: absolute; inset: 0; background: linear-gradient(rgba(255,255,255,0.2), transparent); opacity: 0; transition: opacity 0.3s;
    }
    .game-card:hover:not(.disabled-card) { 
      transform: translateY(-4px); 
      box-shadow: 0 14px 30px rgba(0,0,0,0.45); 
      border-color: rgba(255,255,255,0.35);
    }
    .game-card:hover:not(.disabled-card)::before { opacity: 1; }
    .game-card:active:not(.disabled-card) { transform: translateY(0); }
    
    .disabled-card { opacity: 0.38; cursor: not-allowed; filter: grayscale(85%); }

    .roulette-card { background: linear-gradient(135deg, #2563eb, #7c3aed); box-shadow: 0 6px 20px rgba(37,99,235,0.25); }
    .marble-card { background: linear-gradient(135deg, #e11d48, #ea580c); box-shadow: 0 6px 20px rgba(225,29,72,0.25); }
    .slot-card { background: linear-gradient(135deg, #d97706, #b45309); box-shadow: 0 6px 20px rgba(217,119,6,0.25); }
    .trivia-card { background: linear-gradient(135deg, #0284c7, #7c3aed); box-shadow: 0 6px 20px rgba(2,132,199,0.25); }
    .poker-card-btn { background: linear-gradient(135deg, #db2777, #7c3aed); box-shadow: 0 6px 20px rgba(219,39,119,0.25); }

    .card-icon { font-size: 2.3rem; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); flex-shrink: 0; }
    .card-content { flex: 1; overflow: hidden; }
    .card-content h3 { font-size: 1.3rem; font-weight: 800; margin-bottom: 0.2rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
    .card-content p { font-size: 0.85rem; color: rgba(255,255,255,0.9); font-weight: 500; line-height: 1.3; }

    .card-arrow {
      font-size: 1.1rem;
      color: rgba(255,255,255,0.5);
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .game-card:hover:not(.disabled-card) .card-arrow {
      color: #fff;
      transform: translateX(4px);
    }

    .hint-box {
      background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.4);
      color: #fbbf24; padding: 0.9rem 1.2rem; border-radius: 14px; text-align: center;
      font-weight: 600; font-size: 0.9rem;
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

  goToPoker() {
    if (this.participantService.participants.length > 0) {
      this.router.navigate(['/poker']);
    }
  }
}

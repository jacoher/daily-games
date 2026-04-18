import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import confetti from 'canvas-confetti';
import { Participant } from '../participant.model';
import { SoundService } from '../sound.service';

@Component({
  selector: 'app-roulette',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="roulette-container glass-panel">
      <!-- The Wheel -->
      <div class="wheel-wrapper">
        <div class="pointer">▼</div>
        
        <div class="wheel-box" [style.transform]="'rotate(' + currentRotation + 'deg)'" [style.transition-duration.ms]="spinningDuration" (transitionend)="onTransitionEnd()">
          <canvas #wheelCanvas width="600" height="600"></canvas>
        </div>
        
        <div class="wheel-overlay"></div>
      </div>

      <button class="glass-button spin-btn" (click)="spin()" [disabled]="isSpinning || items.length === 0">
        {{ isSpinning ? 'GIRANDO...' : '¡GIRAR RULETA!' }}
      </button>
    </div>
  `,
  styles: [`
    .roulette-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 30px;
      position: relative;
      background: rgba(10, 10, 26, 0.4);
      padding: 2rem;
      border-radius: 20px;
    }
    .wheel-wrapper {
      position: relative;
      width: 630px;
      height: 630px;
      border-radius: 50%;
      background: linear-gradient(145deg, #3a3a5a, #161625);
      box-shadow: 0 20px 50px rgba(0,0,0,0.8),
                  inset 0 6px 12px rgba(255,255,255,0.2),
                  inset 0 -6px 12px rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .wheel-box {
      width: 600px;
      height: 600px;
      border-radius: 50%;
      overflow: hidden;
      transition-property: transform;
      transition-timing-function: cubic-bezier(0.2, 0.1, 0.1, 1);
      box-shadow: inset 0 0 20px rgba(0,0,0,0.8);
    }
    .wheel-overlay {
      position: absolute;
      top: 15px; left: 15px;
      width: 600px; height: 600px;
      border-radius: 50%;
      pointer-events: none;
      /* Iluminación 3D (highlight arriba-izquierda, sombra abajo-derecha) */
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 30%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.7) 100%);
      box-shadow: inset 0 0 30px rgba(0,0,0,0.9), inset 0 0 8px rgba(255,255,255,0.3);
      z-index: 5;
    }
    .pointer {
      position: absolute;
      top: -25px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 64px;
      color: #fbbf24;
      z-index: 10;
      text-shadow: 0 4px 10px rgba(0,0,0,0.9), 0 -2px 4px rgba(255,255,255,0.6);
      filter: drop-shadow(0 10px 10px rgba(0, 0, 0, 0.8));
    }
    .spin-btn {
      font-size: 1.25rem;
      padding: 1rem 3.5rem;
      border-radius: 30px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 10px;
      width: 100%;
      max-width: 350px;
      font-weight: 800;
      box-shadow: 0 10px 20px rgba(139, 92, 246, 0.4);
    }
    .spin-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }
  `]
})
export class RouletteComponent implements OnChanges {
  @Input() items: Participant[] = [];
  @Input() speedMultiplier: number = 1;
  @Output() winnerSelected = new EventEmitter<Participant>();

  @ViewChild('wheelCanvas', { static: true }) wheelCanvas!: ElementRef<HTMLCanvasElement>;

  currentRotation = 0;
  spinningDuration = 5000;
  isSpinning = false;
  private colors = [
    '#6366f1', '#a855f7', '#ec4899', '#e11d48',
    '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
    '#06b6d4', '#3b82f6', '#ef4444'
  ];

  selectedItemIndex = -1;
  private loadedImages = new Map<string, HTMLImageElement>();

  constructor(private soundService: SoundService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['items']) {
      this.preloadImages().then(() => this.drawWheel());
    }
  }

  async preloadImages() {
    const promises = this.items.map(item => {
      if (!item.avatarUrl) return Promise.resolve();
      if (!this.loadedImages.has(item.avatarUrl)) {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            this.loadedImages.set(item.avatarUrl, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = item.avatarUrl;
        });
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
  }

  drawWheel() {
    const canvas = this.wheelCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const numItems = this.items.length;
    if (numItems === 0) {
      ctx.beginPath();
      ctx.arc(300, 300, 300, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      return;
    }

    const anglePerItem = (2 * Math.PI) / numItems;

    for (let i = 0; i < numItems; i++) {
      const angleStart = i * anglePerItem - (Math.PI / 2);
      const angleEnd = angleStart + anglePerItem;

      ctx.beginPath();
      ctx.moveTo(300, 300);
      ctx.arc(300, 300, 300, angleStart, angleEnd);
      ctx.fillStyle = this.colors[i % this.colors.length];
      ctx.fill();
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.stroke();

      ctx.save();
      ctx.translate(300, 300);
      ctx.rotate(angleStart + anglePerItem / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px Outfit";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(this.items[i].name, 275, 10);
      
      const img = this.loadedImages.get(this.items[i].avatarUrl);
      if (img) {
        ctx.shadowColor = "transparent";
        ctx.beginPath();
        const picSize = 64;
        ctx.arc(100, 0, picSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 100 - picSize / 2, -picSize / 2, picSize, picSize);
      }
      ctx.restore();
    }
  }

  spin() {
    if (this.isSpinning || this.items.length === 0) return;

    this.isSpinning = true;

    const winningIndex = Math.floor(Math.random() * this.items.length);
    this.selectedItemIndex = winningIndex;

    const numItems = this.items.length;
    const anglePerItem = 360 / numItems;
    
    const extraSpins = 5 * 360; 
    
    const targetAngle = -(winningIndex * anglePerItem + anglePerItem / 2);

    this.spinningDuration = 5000 * this.speedMultiplier;
    
    const currentBase = Math.floor(this.currentRotation / 360) * 360;
    
    let finalAngle = currentBase + extraSpins + targetAngle;
    
    if (finalAngle <= this.currentRotation) {
      finalAngle += 360;
    }

    this.currentRotation = finalAngle;
    this.soundService.playSpinningSound(this.spinningDuration);
  }

  onTransitionEnd() {
    if (this.isSpinning) {
      this.isSpinning = false;
      this.soundService.stopSpinning();
      this.soundService.playWinnerSound();
      const winner = this.items[this.selectedItemIndex];
      this.fireworks();
      this.winnerSelected.emit(winner);
    }
  }

  fireworks() {
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 60 * (timeLeft / duration);
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  }
}

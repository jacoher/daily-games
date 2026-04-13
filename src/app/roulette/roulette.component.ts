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
      <!-- Pointer -->
      <div class="pointer">▼</div>
      
      <!-- The Wheel -->
      <div class="wheel-box" [style.transform]="'rotate(' + currentRotation + 'deg)'" [style.transition-duration.ms]="spinningDuration" (transitionend)="onTransitionEnd()">
        <canvas #wheelCanvas width="400" height="400"></canvas>
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
      gap: 20px;
      position: relative;
      background: rgba(10, 10, 26, 0.4);
    }
    .wheel-box {
      width: 400px;
      height: 400px;
      border-radius: 50%;
      box-shadow: 0 0 30px rgba(139, 92, 246, 0.6), inset 0 0 20px rgba(0,0,0,0.8);
      border: 6px solid rgba(255, 255, 255, 0.2);
      overflow: hidden;
      transition-property: transform;
      transition-timing-function: cubic-bezier(0.2, 0.1, 0.1, 1);
    }
    .pointer {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 48px;
      color: #fbbf24;
      z-index: 10;
      text-shadow: 0 4px 6px rgba(0,0,0,0.8);
      filter: drop-shadow(0 0 8px rgba(251, 191, 36, 1));
    }
    .spin-btn {
      font-size: 1.25rem;
      padding: 1rem 2.5rem;
      border-radius: 30px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 10px;
      width: 100%;
      font-weight: 800;
    }
    .spin-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
      ctx.arc(200, 200, 200, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      return;
    }

    const anglePerItem = (2 * Math.PI) / numItems;

    for (let i = 0; i < numItems; i++) {
      const angleStart = i * anglePerItem - (Math.PI / 2);
      const angleEnd = angleStart + anglePerItem;

      ctx.beginPath();
      ctx.moveTo(200, 200);
      ctx.arc(200, 200, 200, angleStart, angleEnd);
      ctx.fillStyle = this.colors[i % this.colors.length];
      ctx.fill();
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.stroke();

      ctx.save();
      ctx.translate(200, 200);
      ctx.rotate(angleStart + anglePerItem / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Outfit";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(this.items[i].name, 180, 7);
      
      const img = this.loadedImages.get(this.items[i].avatarUrl);
      if (img) {
        ctx.shadowColor = "transparent";
        ctx.beginPath();
        const picSize = 34;
        ctx.arc(50, 0, picSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 50 - picSize / 2, -picSize / 2, picSize, picSize);
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

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
    <div class="roulette-container glass-panel animate-in">
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
    :host {
      display: block;
      width: 100%;
    }
    .roulette-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      position: relative;
      background: rgba(10, 10, 26, 0.4);
      padding: clamp(1rem, 3vw, 2rem);
      border-radius: 24px;
      width: 100%;
      box-sizing: border-box;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    }
    .wheel-wrapper {
      position: relative;
      width: 100%;
      max-width: min(85vw, 55vh, 600px);
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      background: linear-gradient(145deg, #2e2e48, #0e0e1a);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8),
                  inset 0 6px 12px rgba(255, 255, 255, 0.15),
                  inset 0 -6px 12px rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }
    .wheel-box {
      width: calc(100% - 24px);
      height: calc(100% - 24px);
      border-radius: 50%;
      overflow: hidden;
      transition-property: transform;
      transition-timing-function: cubic-bezier(0.15, 0.85, 0.15, 1);
      box-shadow: inset 0 0 25px rgba(0,0,0,0.9);
      background: #09090f;
    }
    .wheel-box canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    .wheel-overlay {
      position: absolute;
      top: 12px; left: 12px;
      width: calc(100% - 24px); 
      height: calc(100% - 24px);
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.65) 100%);
      box-shadow: inset 0 0 25px rgba(0,0,0,0.85), inset 0 0 8px rgba(255,255,255,0.25);
      z-index: 5;
    }
    .pointer {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      font-size: clamp(38px, 8vw, 56px);
      color: #fbbf24;
      z-index: 20;
      text-shadow: 0 0 15px rgba(251, 191, 36, 0.8), 0 4px 8px rgba(0, 0, 0, 0.6);
      animation: bounceIndicator 2s infinite ease-in-out;
    }
    @keyframes bounceIndicator {
      0%, 100% { transform: translate(-50%, 0); }
      50% { transform: translate(-50%, -4px); }
    }
    .spin-btn {
      font-size: clamp(1.1rem, 4vw, 1.35rem);
      padding: 1.1rem 2.2rem;
      border-radius: 35px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 10px;
      width: 100%;
      max-width: 350px;
      font-weight: 900;
      background: linear-gradient(135deg, #a855f7 0%, #06b6d4 100%);
      border: 2px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 10px 25px rgba(168, 85, 247, 0.4), 0 0 30px rgba(6, 182, 212, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .spin-btn:hover:not(:disabled) {
      transform: translateY(-3px) scale(1.03);
      box-shadow: 0 15px 35px rgba(168, 85, 247, 0.6), 0 0 40px rgba(6, 182, 212, 0.4);
    }
    .spin-btn:active:not(:disabled) {
      transform: translateY(-1px) scale(0.98);
      box-shadow: 0 8px 20px rgba(168, 85, 247, 0.4);
    }
    .spin-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      box-shadow: none;
      background: linear-gradient(135deg, #4b5563, #374151);
      border-color: transparent;
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
          img.onload = () => {
            this.loadedImages.set(item.avatarUrl, img);
            resolve();
          };
          img.onerror = () => {
            const fallback = new Image();
            fallback.onload = () => {
              this.loadedImages.set(item.avatarUrl, fallback);
              resolve();
            };
            fallback.onerror = () => resolve();
            fallback.src = 'https://api.dicebear.com/7.x/pixel-art/png?seed=' + encodeURIComponent(item.name);
          };
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

    // Draw Slices
    for (let i = 0; i < numItems; i++) {
      const angleStart = i * anglePerItem - (Math.PI / 2);
      const angleEnd = angleStart + anglePerItem;

      ctx.beginPath();
      ctx.moveTo(300, 300);
      ctx.arc(300, 300, 300, angleStart, angleEnd);
      ctx.fillStyle = this.colors[i % this.colors.length];
      ctx.fill();
      
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.stroke();

      ctx.save();
      ctx.translate(300, 300);
      ctx.rotate(angleStart + anglePerItem / 2);
      
      // Dynamic sizes based on participant count to look perfect on mobile & high densities
      const fontSize = Math.max(12, Math.min(28, Math.floor(220 / numItems)));
      const avatarSize = Math.max(26, Math.min(54, Math.floor(400 / numItems)));
      
      const avatarCenter = 235; // Position close to outer rim
      const avatarRadius = avatarSize / 2;

      // Draw Avatar
      const img = this.loadedImages.get(this.items[i].avatarUrl);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarCenter, 0, avatarRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, avatarCenter - avatarRadius, -avatarRadius, avatarSize, avatarSize);
        ctx.restore();

        // Draw elegant circular border
        ctx.beginPath();
        ctx.arc(avatarCenter, 0, avatarRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Fallback elegant circular letter badge
        ctx.beginPath();
        ctx.arc(avatarCenter, 0, avatarRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.max(10, Math.floor(fontSize * 0.9))}px Outfit`;
        const initial = this.items[i].name.trim().charAt(0).toUpperCase();
        ctx.fillText(initial, avatarCenter, 0);
      }

      // Draw text starting from near center and going outwards
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSize}px Outfit`;
      
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1.5;
      ctx.shadowOffsetY = 1.5;

      // Restrict text width so it never touches the avatar circle
      const textStart = 65; // Just outside the center cap
      const maxTextWidth = (avatarCenter - avatarRadius - 15) - textStart;
      let name = this.items[i].name;
      
      let measuredWidth = ctx.measureText(name).width;
      if (measuredWidth > maxTextWidth) {
        while (name.length > 3 && ctx.measureText(name + '...').width > maxTextWidth) {
          name = name.slice(0, -1);
        }
        name = name + '...';
      }

      ctx.fillText(name, textStart, 0);
      ctx.restore();
    }

    // Draw Gold Outer Border on canvas
    ctx.beginPath();
    ctx.arc(300, 300, 298, 0, 2 * Math.PI);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw elegant 3D Center Cap (Hub)
    const hubRadius = 45;
    ctx.save();
    ctx.beginPath();
    ctx.arc(300, 300, hubRadius, 0, 2 * Math.PI);
    const hubGrad = ctx.createRadialGradient(300, 300, 0, 300, 300, hubRadius);
    hubGrad.addColorStop(0, '#2e2e4a');
    hubGrad.addColorStop(0.7, '#141424');
    hubGrad.addColorStop(1, '#08080f');
    ctx.fillStyle = hubGrad;
    ctx.fill();

    // Center cap gold border
    ctx.beginPath();
    ctx.arc(300, 300, hubRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw a small metallic centerpiece dot
    ctx.beginPath();
    ctx.arc(300, 300, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.restore();
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

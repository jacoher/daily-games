import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import confetti from 'canvas-confetti';
import { ParticipantService } from '../participant.service';
import { Participant } from '../participant.model';
import { SoundService } from '../sound.service';

@Component({
  selector: 'app-slot-machine',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slot-machine.component.html',
  styleUrls: ['./slot-machine.component.css']
})
export class SlotMachineComponent implements OnInit, OnDestroy {
  // Game session participants (isolated from persistent global list)
  activeParticipants: Participant[] = [];
  
  // Slot reels state
  ITEM_HEIGHT = 120; // Matches CSS item height
  reelsCount = 3;
  reelStrips: Participant[][] = [[], [], []];
  reelOffsets = [80, 80, 80];
  reelTransitions = ['none', 'none', 'none'];
  isReelSpinning = [false, false, false];

  // Game flow state
  isSpinning = false;
  winnerModalOpen = false;
  selectedWinner: Participant | null = null;

  // Mechanical lever physics state
  isDraggingLever = false;
  leverProgress = 0; // 0 = idle upright, 1 = fully pulled down
  leverTransform = 'rotateX(0deg) scaleY(1) translateY(0px)';
  leverTransition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  private dragStartY = 0;
  private lastRatchetStep = 0;

  constructor(
    public participantService: ParticipantService,
    private soundService: SoundService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Copy participants for this session so removing only affects current game
    this.activeParticipants = [...this.participantService.participants];
    if (this.activeParticipants.length === 0) {
      this.router.navigate(['/']);
      return;
    }
    this.buildReels();
  }

  ngOnDestroy(): void {
    this.soundService.stopSlotSpinLoop();
  }

  buildReels(): void {
    if (this.activeParticipants.length === 0) {
      this.reelStrips = [[], [], []];
      return;
    }

    // Build strip with duplicated participants for smooth scroll & blur
    const baseList = this.activeParticipants;
    const repeatCount = Math.max(14, Math.ceil(40 / baseList.length));

    for (let r = 0; r < 3; r++) {
      const fullList: Participant[] = [];
      for (let i = 0; i < repeatCount; i++) {
        fullList.push(...baseList);
      }
      this.reelStrips[r] = fullList;
      
      // Center position offset: (viewport 280px - item 120px) / 2 = 80px
      this.reelTransitions[r] = 'none';
      this.reelOffsets[r] = 80;
      this.isReelSpinning[r] = false;
    }
  }

  // Keyboard shortcut listener
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (this.winnerModalOpen) return;
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      this.pullLever();
    }
  }

  // Realistic lever physics & drag tracking
  onLeverMouseDown(event: MouseEvent): void {
    if (this.isSpinning || this.activeParticipants.length < 2) return;
    event.preventDefault();
    this.startLeverDrag(event.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      this.updateLeverDrag(moveEvent.clientY);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      this.endLeverDrag();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  onLeverTouchStart(event: TouchEvent): void {
    if (this.isSpinning || this.activeParticipants.length < 2) return;
    if (event.touches.length === 0) return;
    this.startLeverDrag(event.touches[0].clientY);

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length > 0) {
        this.updateLeverDrag(moveEvent.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      this.endLeverDrag();
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  }

  private startLeverDrag(startY: number): void {
    this.isDraggingLever = true;
    this.dragStartY = startY;
    this.leverTransition = 'none'; // Instant follow during drag
    this.lastRatchetStep = 0;
  }

  private updateLeverDrag(currentY: number): void {
    if (!this.isDraggingLever) return;
    const deltaY = currentY - this.dragStartY;
    
    // Drag distance: 130px for full pull
    const MAX_DRAG = 130;
    this.leverProgress = Math.max(0, Math.min(1, deltaY / MAX_DRAG));

    // Ratchet sound ticks as the user pulls down through mechanical notches
    const currentStep = Math.floor(this.leverProgress * 6);
    if (currentStep > this.lastRatchetStep) {
      this.soundService.playLeverRatchetClick();
      this.lastRatchetStep = currentStep;
    }

    // Dynamic 3D rotation and foreshortening
    const rotDeg = this.leverProgress * 68; // 0deg -> 68deg
    const scaleY = 1 - (this.leverProgress * 0.38); // 1 -> 0.62
    const transY = this.leverProgress * 48; // 0px -> 48px

    this.leverTransform = `rotateX(${rotDeg}deg) scaleY(${scaleY}) translateY(${transY}px)`;
  }

  private endLeverDrag(): void {
    if (!this.isDraggingLever) return;
    this.isDraggingLever = false;

    // If dragged at least 50% or clicked, fire the spin; otherwise spring back
    if (this.leverProgress >= 0.45) {
      this.fireLeverRelease();
    } else {
      // Spring back to upright resting position
      this.leverTransition = 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      this.leverTransform = 'rotateX(0deg) scaleY(1) translateY(0px)';
      this.leverProgress = 0;
    }
  }

  // Trigger Lever (either via button click, keyboard or quick tap)
  pullLever(): void {
    if (this.isSpinning || this.activeParticipants.length < 2) return;
    
    // Quick physical pull-down animation
    this.leverTransition = 'transform 0.16s cubic-bezier(0.4, 0, 0.2, 1)';
    this.leverTransform = 'rotateX(68deg) scaleY(0.62) translateY(48px)';
    this.soundService.playLeverRatchetClick();

    setTimeout(() => {
      this.fireLeverRelease();
    }, 170);
  }

  private fireLeverRelease(): void {
    this.isSpinning = true;

    // Heavy mechanical trip latch sound
    this.soundService.playSlotLeverPull();

    // Elastic spring release back to top with mechanical bounce
    this.leverTransition = 'transform 0.4s cubic-bezier(0.18, 0.9, 0.32, 1.35)';
    this.leverTransform = 'rotateX(0deg) scaleY(1) translateY(0px)';
    this.leverProgress = 0;

    // Pick random winning participant from active participants
    const winnerIdx = Math.floor(Math.random() * this.activeParticipants.length);
    this.selectedWinner = this.activeParticipants[winnerIdx];

    // Start spin loop audio
    this.soundService.startSlotSpinLoop();

    // Enable rapid continuous spinning on all reels
    for (let r = 0; r < 3; r++) {
      this.isReelSpinning[r] = true;
      this.reelTransitions[r] = 'none';
    }

    // Cascading deceleration and landing
    // Reel 1 stop: ~2.0s, Reel 2 stop: ~2.7s, Reel 3 stop: ~3.4s
    const stopDelays = [2000, 2700, 3400];

    stopDelays.forEach((delay, r) => {
      setTimeout(() => {
        // Prepare target item index on the strip
        const strip = this.reelStrips[r];
        let targetIndex = -1;
        const minIndex = 12 + (r * 3);

        for (let i = minIndex; i < strip.length; i++) {
          if (strip[i].name === this.selectedWinner!.name) {
            targetIndex = i;
            break;
          }
        }

        if (targetIndex === -1) {
          targetIndex = winnerIdx;
        }

        const targetOffset = 80 - (targetIndex * this.ITEM_HEIGHT);

        // Turn off infinite rapid loop and engage smooth brake deceleration
        this.isReelSpinning[r] = false;
        this.reelTransitions[r] = 'transform 0.65s cubic-bezier(0.15, 0.9, 0.25, 1.08)';
        this.reelOffsets[r] = targetOffset;

        // Play reel mechanical lock clack
        this.soundService.playSlotReelStop();

        // When the 3rd and final reel locks in:
        if (r === 2) {
          this.soundService.stopSlotSpinLoop();
          setTimeout(() => {
            this.handleWinnerReveal();
          }, 350);
        }
      }, delay);
    });
  }

  handleWinnerReveal(): void {
    this.isSpinning = false;
    this.winnerModalOpen = true;

    // Sound: celebratory casino jackpot with coins
    this.soundService.playCasinoJackpot();

    // Confetti burst
    this.triggerConfetti();
  }

  triggerConfetti(): void {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#fbbf24', '#ef4444', '#10b981', '#ffffff']
    });

    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 250);
  }

  // Modal actions: removes participant ONLY from current game session
  removeWinner(): void {
    if (this.selectedWinner) {
      this.activeParticipants = this.activeParticipants.filter(
        p => p.name !== this.selectedWinner!.name
      );
      this.buildReels();
    }
    this.closeModal();
  }

  keepWinner(): void {
    this.closeModal();
  }

  closeModal(): void {
    this.winnerModalOpen = false;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}

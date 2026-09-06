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
  participants: Participant[] = [];
  
  // Slot reels state
  ITEM_HEIGHT = 120; // Matches CSS item height
  reelsCount = 3;
  reelStrips: Participant[][] = [[], [], []];
  reelOffsets = [0, 0, 0];
  reelTransitions = ['none', 'none', 'none'];
  isReelSpinning = [false, false, false];

  // Game flow state
  isSpinning = false;
  isLeverPulled = false;
  winnerModalOpen = false;
  selectedWinner: Participant | null = null;
  selectedWinnerIndex = -1;

  private isDraggingLever = false;
  private dragStartY = 0;

  constructor(
    private participantService: ParticipantService,
    private soundService: SoundService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.refreshParticipants();
    this.buildReels();
  }

  ngOnDestroy(): void {
    this.soundService.stopSlotSpinLoop();
  }

  refreshParticipants(): void {
    this.participants = [...this.participantService.participants];
  }

  buildReels(): void {
    if (this.participants.length === 0) {
      this.reelStrips = [[], [], []];
      return;
    }

    // Prepare each reel strip with repeated participants for spinning effect
    // 1 visible in center, with enough items ahead and behind
    const baseList = this.participants;
    const repeatCount = Math.max(12, Math.ceil(40 / baseList.length));

    for (let r = 0; r < 3; r++) {
      const fullList: Participant[] = [];
      for (let i = 0; i < repeatCount; i++) {
        fullList.push(...baseList);
      }
      this.reelStrips[r] = fullList;
      
      // Center position: viewport height (280px), item height (120px) -> center offset is (280 - 120)/2 = 80px
      // Initial offset puts index 0 at center:
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

  // Drag-to-pull lever interactions
  onLeverMouseDown(event: MouseEvent): void {
    if (this.isSpinning || this.participants.length < 2) return;
    this.isDraggingLever = true;
    this.dragStartY = event.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isDraggingLever) return;
      const deltaY = moveEvent.clientY - this.dragStartY;
      if (deltaY > 50) {
        this.isDraggingLever = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        this.pullLever();
      }
    };

    const onMouseUp = () => {
      this.isDraggingLever = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // Trigger Lever and start casino spin sequence
  pullLever(): void {
    if (this.isSpinning || this.participants.length < 2) return;

    this.isSpinning = true;
    this.isLeverPulled = true;

    // Sound: mechanical lever pull
    this.soundService.playSlotLeverPull();

    // Lever release spring back animation
    setTimeout(() => {
      this.isLeverPulled = false;
    }, 280);

    // Pick random winning participant
    const winnerIdx = Math.floor(Math.random() * this.participants.length);
    this.selectedWinner = this.participants[winnerIdx];
    this.selectedWinnerIndex = winnerIdx;

    // Start spin loop audio
    this.soundService.startSlotSpinLoop();

    // Configure spin animations for each reel with cascading stops
    // Center viewport target offset formula: 80 - (targetItemIndex * 120)
    const baseRevolutions = 15;
    const spinDurations = [2600, 3300, 4000]; // Reel 1, Reel 2, Reel 3

    for (let r = 0; r < 3; r++) {
      this.isReelSpinning[r] = true;
      
      // Target index within the strip to land on the winner:
      // We choose an index far down the strip so it scrolls many times
      const strip = this.reelStrips[r];
      let targetIndex = -1;
      const minIndex = baseRevolutions + (r * 4);

      for (let i = minIndex; i < strip.length; i++) {
        if (strip[i].name === this.selectedWinner.name) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex === -1) {
        // Fallback safety
        targetIndex = winnerIdx;
      }

      const targetOffset = 80 - (targetIndex * this.ITEM_HEIGHT);
      const durationSeconds = (spinDurations[r] / 1000).toFixed(2);

      // Reset transition first
      this.reelTransitions[r] = `transform ${durationSeconds}s cubic-bezier(0.12, 0.85, 0.22, 1.04)`;
      this.reelOffsets[r] = targetOffset;

      // Handle reel stop events
      setTimeout(() => {
        this.isReelSpinning[r] = false;
        this.soundService.playSlotReelStop();

        // When the final reel stops:
        if (r === 2) {
          this.soundService.stopSlotSpinLoop();
          setTimeout(() => {
            this.handleWinnerReveal();
          }, 350);
        }
      }, spinDurations[r]);
    }
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

  // Modal actions
  removeWinner(): void {
    if (this.selectedWinnerIndex > -1) {
      this.participantService.removeParticipant(this.selectedWinnerIndex);
      this.refreshParticipants();
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

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private audioCtx: AudioContext | null = null;
  private isSpinning = false;

  private initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTick() {
    this.initAudio();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.audioCtx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.1);
  }

  playWinnerSound() {
    this.initAudio();
    if (!this.audioCtx) return;

    const notes = [
        { freq: 261.63, start: 0, duration: 0.15 },
        { freq: 329.63, start: 0.15, duration: 0.15 },
        { freq: 392.00, start: 0.3, duration: 0.15 },
        { freq: 523.25, start: 0.45, duration: 0.6 }
    ];

    notes.forEach(note => {
      const osc = this.audioCtx!.createOscillator();
      const gainNode = this.audioCtx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(note.freq, this.audioCtx!.currentTime + note.start);
      
      gainNode.gain.setValueAtTime(0.1, this.audioCtx!.currentTime + note.start);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx!.currentTime + note.start + note.duration);

      osc.connect(gainNode);
      gainNode.connect(this.audioCtx!.destination);

      osc.start(this.audioCtx!.currentTime + note.start);
      osc.stop(this.audioCtx!.currentTime + note.start + note.duration);
    });
  }

  stopSpinning() {
      this.isSpinning = false;
  }

  playSpinningSound(durationMs: number) {
    this.isSpinning = true;
    let delay = 30; // Initial delay between ticks in ms
    let elapsedTime = 0;
    
    const tickLoop = () => {
        if (!this.isSpinning || elapsedTime >= durationMs) return;
        
        this.playTick();
        elapsedTime += delay;
        // Increase delay gradually to simulate the wheel slowing down
        delay *= 1.05; 
        
        setTimeout(tickLoop, delay);
    };
    
    tickLoop();
  }
}

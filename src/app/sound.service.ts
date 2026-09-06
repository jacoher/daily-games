import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private audioCtx: AudioContext | null = null;
  private isSpinning = false;

  // Ambient music state
  private ambientNodes: AudioNode[] = [];
  private ambientGain: GainNode | null = null;
  private ambientActive = false;

  // Throttle clack sounds so they don't overlap too often
  private lastClackTime = 0;

  private initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // -------------------------------------------------------
  // Reverb helper – creates a simple convolver reverb tail
  // -------------------------------------------------------
  private createReverb(duration = 1.5, decay = 2.0): ConvolverNode {
    const ctx = this.audioCtx!;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let c = 0; c < 2; c++) {
      const channel = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }

    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
  }

  // -------------------------------------------------------
  // playTick – soft crystal bell (for roulette)
  // -------------------------------------------------------
  playTick() {
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  }

  // -------------------------------------------------------
  // playClack – soft xylophone / water-drop hit on collision
  // -------------------------------------------------------
  playClack(velocity: number) {
    this.initAudio();
    if (!this.audioCtx) return;
    if (velocity < 1.5) return;

    // Throttle: max one clack every 80 ms
    const now = this.audioCtx.currentTime;
    if (now - this.lastClackTime < 0.08) return;
    this.lastClackTime = now;

    const ctx = this.audioCtx;

    // Pick a note from a pentatonic scale for a melodic, relaxing feel
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66];
    const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Sine wave = soft and round (xylophone-like)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.25);

    // Volume scales gently with impact force, but stays quiet
    const volume = Math.min(velocity / 40, 0.18);
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    // Light reverb tail
    const convolver = this.createReverb(0.6, 3.0);

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.25;

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);        // dry
    gainNode.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(ctx.destination);       // wet

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // -------------------------------------------------------
  // playWinnerSound – harp-like ascending arpeggio + shimmer
  // -------------------------------------------------------
  playWinnerSound() {
    this.initAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Bright, uplifting chord progression (C major pentatonic arpeggio)
    const arpeggio = [
      { freq: 523.25, start: 0.00, dur: 0.6 },    // C5
      { freq: 659.25, start: 0.12, dur: 0.6 },    // E5
      { freq: 783.99, start: 0.24, dur: 0.6 },    // G5
      { freq: 1046.50, start: 0.36, dur: 0.8 },   // C6
      { freq: 1318.51, start: 0.52, dur: 1.0 },   // E6 (shimmer top)
    ];

    const convolver = this.createReverb(2.0, 2.5);
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.5;
    convolver.connect(reverbGain);
    reverbGain.connect(ctx.destination);

    arpeggio.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      gain.gain.setValueAtTime(0.0, now + note.start);
      gain.gain.linearRampToValueAtTime(0.15, now + note.start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.dur);

      osc.connect(gain);
      gain.connect(masterGain);   // dry
      gain.connect(convolver);    // reverb

      osc.start(now + note.start);
      osc.stop(now + note.start + note.dur + 0.1);
    });

    // Soft shimmer layer (high-frequency gentle noise)
    this.playShimmer(now + 0.5, 0.8);
  }

  // -------------------------------------------------------
  // playShimmer – gentle twinkling stars effect
  // -------------------------------------------------------
  private playShimmer(startTime: number, duration: number) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;

    const shimmerFreqs = [2093, 2349, 2637, 3136];
    shimmerFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + i * 0.07);

      gain.gain.setValueAtTime(0.0, startTime + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.06, startTime + i * 0.07 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + i * 0.07);
      osc.stop(startTime + duration + 0.1);
    });
  }

  // -------------------------------------------------------
  // startAmbientMusic – calming lo-fi background pad
  // -------------------------------------------------------
  startAmbientMusic() {
    this.initAudio();
    if (!this.audioCtx || this.ambientActive) return;

    this.ambientActive = true;
    const ctx = this.audioCtx;

    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0, ctx.currentTime);
    this.ambientGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 3); // fade in gently
    this.ambientGain.connect(ctx.destination);

    // Pad chord: Am7 – C – G – Em (calm progression)
    const chordFreqs = [
      220.00,   // A3
      261.63,   // C4
      329.63,   // E4
      392.00,   // G4
      493.88,   // B4 (7th)
    ];

    chordFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sine';
      // Slight detune for warmth / chorus effect
      osc.detune.value = (i % 3 === 0 ? -4 : i % 3 === 1 ? 4 : 0);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Slowly oscillate amplitude for a "breathing" pad effect
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.1 + i * 0.03; // very slow
      lfoGain.gain.value = 0.3;
      lfo.connect(lfoGain);
      lfoGain.connect(oscGain.gain);

      oscGain.gain.value = 0.2;

      osc.connect(oscGain);
      oscGain.connect(this.ambientGain!);

      osc.start();
      lfo.start();

      this.ambientNodes.push(osc, lfo, oscGain);
    });

    // Subtle low-frequency rumble (water / environment feel)
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 150;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.04;

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ambientGain);

    noiseSource.start();
    this.ambientNodes.push(noiseSource, noiseFilter);
  }

  // -------------------------------------------------------
  // stopAmbientMusic – graceful fade-out
  // -------------------------------------------------------
  stopAmbientMusic() {
    if (!this.audioCtx || !this.ambientGain) return;
    const ctx = this.audioCtx;

    this.ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);

    setTimeout(() => {
      this.ambientNodes.forEach(node => {
        try { (node as OscillatorNode | AudioBufferSourceNode).stop?.(); } catch {}
      });
      this.ambientNodes = [];
      this.ambientActive = false;
      this.ambientGain = null;
    }, 2200);
  }

  // -------------------------------------------------------
  // Kept for roulette compatibility
  // -------------------------------------------------------
  stopSpinning() {
    this.isSpinning = false;
  }

  playSpinningSound(durationMs: number) {
    this.isSpinning = true;
    let delay = 30;
    let elapsedTime = 0;

    const tickLoop = () => {
      if (!this.isSpinning || elapsedTime >= durationMs) return;

      this.playTick();
      elapsedTime += delay;
      delay *= 1.05;

      setTimeout(tickLoop, delay);
    };

    tickLoop();
  }

  // -------------------------------------------------------
  // Casino Slot Machine Sounds
  // -------------------------------------------------------
  private slotSpinLoopTimer: any = null;
  private isSlotSpinning = false;

  playSlotLeverPull() {
    this.initAudio();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;

    // 1. Heavy mechanical clank (snap / gear latch)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);

    // 2. Spring release metallic resonance
    setTimeout(() => {
      if (!this.audioCtx) return;
      const t = this.audioCtx.currentTime;
      const springOsc = this.audioCtx.createOscillator();
      const springGain = this.audioCtx.createGain();
      springOsc.type = 'triangle';
      springOsc.frequency.setValueAtTime(320, t);
      springOsc.frequency.linearRampToValueAtTime(180, t + 0.2);

      springGain.gain.setValueAtTime(0.25, t);
      springGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      springOsc.connect(springGain);
      springGain.connect(this.audioCtx.destination);
      springOsc.start(t);
      springOsc.stop(t + 0.23);
    }, 60);
  }

  startSlotSpinLoop() {
    this.initAudio();
    this.isSlotSpinning = true;
    if (this.slotSpinLoopTimer) {
      clearInterval(this.slotSpinLoopTimer);
    }

    // Continuous mechanical click / ratchet sound during spin
    this.slotSpinLoopTimer = setInterval(() => {
      if (!this.isSlotSpinning || !this.audioCtx) return;
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(750 + Math.random() * 100, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    }, 65);
  }

  stopSlotSpinLoop() {
    this.isSlotSpinning = false;
    if (this.slotSpinLoopTimer) {
      clearInterval(this.slotSpinLoopTimer);
      this.slotSpinLoopTimer = null;
    }
  }

  playSlotReelStop() {
    this.initAudio();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;

    // Solid mechanical brake thud & metallic lock
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.16);

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);

    // High accent metallic ping
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(1400, ctx.currentTime);
    pingGain.gain.setValueAtTime(0.15, ctx.currentTime);
    pingGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    ping.connect(pingGain);
    pingGain.connect(ctx.destination);
    ping.start(ctx.currentTime);
    ping.stop(ctx.currentTime + 0.09);
  }

  playCasinoJackpot() {
    this.initAudio();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;

    // 1. Triumphant arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
    notes.forEach((freq, index) => {
      setTimeout(() => {
        if (!this.audioCtx) return;
        const o = this.audioCtx.createOscillator();
        const g = this.audioCtx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        g.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);

        o.connect(g);
        g.connect(this.audioCtx.destination);
        o.start(this.audioCtx.currentTime);
        o.stop(this.audioCtx.currentTime + 0.42);
      }, index * 110);
    });

    // 2. Cascading coins effect
    const coinDelayStart = notes.length * 110;
    for (let i = 0; i < 18; i++) {
      setTimeout(() => {
        if (!this.audioCtx) return;
        const o = this.audioCtx.createOscillator();
        const g = this.audioCtx.createGain();
        o.type = 'sine';
        // Random bright frequencies for bouncing coins
        o.frequency.setValueAtTime(1800 + Math.random() * 800, this.audioCtx.currentTime);

        g.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);

        o.connect(g);
        g.connect(this.audioCtx.destination);
        o.start(this.audioCtx.currentTime);
        o.stop(this.audioCtx.currentTime + 0.09);
      }, coinDelayStart + i * 65);
    }
  }
}


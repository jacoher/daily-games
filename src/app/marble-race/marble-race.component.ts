import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ParticipantService } from '../participant.service';
import { Participant } from '../participant.model';
import Matter from 'matter-js';

@Component({
  selector: 'app-marble-race',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="race-container">
      <button class="glass-button back-btn" (click)="goBack()">⬅️ Volver</button>
      <div class="race-header">
        <h2 class="race-title">🔴 Carrera en Marte 🔴</h2>
        <button class="glass-button start-btn" (click)="startRace()" *ngIf="!raceStarted">¡INICIAR CARRERA!</button>
      </div>

      <div class="canvas-wrapper">
        <canvas #raceCanvas></canvas>
        
        <!-- Podio y resultados -->
        <div class="results-modal" *ngIf="raceFinished">
          <h2>🏆 ¡Resultados Oficiales! 🏆</h2>
          <div class="ranking-list">
            <div class="ranking-item" *ngFor="let result of results; let i = index">
              <span class="position" [ngClass]="{'first': i === 0, 'second': i === 1, 'third': i === 2}">#{{ i + 1 }}</span>
              <div class="marble-color" [style.background]="result.color"></div>
              <span class="name">{{ result.participant.name }}</span>
              <span class="time">{{ result.time | number:'1.2-2' }}s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .race-container {
      position: relative;
      width: 100vw;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #1a0b08; /* Martian theme */
      padding: 2rem 0;
      box-sizing: border-box;
    }
    .back-btn {
      position: absolute;
      top: 20px;
      left: 20px;
      z-index: 50;
    }
    .race-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1rem;
      z-index: 10;
    }
    .race-title {
      font-size: 2.5rem;
      color: #ff6b4a;
      text-shadow: 0 0 15px rgba(255, 107, 74, 0.8);
      margin-bottom: 1rem;
    }
    .start-btn {
      font-size: 1.2rem;
      padding: 0.8rem 2rem;
      background: linear-gradient(135deg, #ff416c, #ff4b2b);
    }
    .canvas-wrapper {
      position: relative;
      width: 100%;
      max-width: 800px;
      height: 70vh;
      border: 4px solid #ff6b4a;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 0 30px rgba(255, 107, 74, 0.4);
      background: radial-gradient(circle at center, #2e120d 0%, #170704 100%);
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .results-modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(20, 5, 2, 0.9);
      padding: 2rem;
      border-radius: 15px;
      border: 2px solid #ffb347;
      box-shadow: 0 0 40px rgba(255, 179, 71, 0.5);
      z-index: 100;
      width: 90%;
      max-width: 400px;
      backdrop-filter: blur(10px);
      animation: popIn 0.5s ease-out;
    }
    .results-modal h2 {
      text-align: center;
      color: #ffb347;
      margin-bottom: 1.5rem;
    }
    .ranking-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 50vh;
      overflow-y: auto;
    }
    .ranking-item {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
    }
    .position {
      font-size: 1.5rem;
      font-weight: bold;
      color: #aaa;
      width: 40px;
      text-align: center;
    }
    .position.first { color: #ffd700; font-size: 2rem; }
    .position.second { color: #c0c0c0; font-size: 1.8rem; }
    .position.third { color: #cd7f32; font-size: 1.6rem; }
    
    .marble-color {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      box-shadow: inset -2px -2px 5px rgba(0,0,0,0.5);
    }
    .name {
      flex: 1;
      font-size: 1.2rem;
      color: #fff;
    }
    .time {
      font-size: 1rem;
      color: #ffb347;
      font-family: monospace;
    }
    @keyframes popIn {
      0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
  `]
})
export class MarbleRaceComponent implements OnInit, OnDestroy {
  @ViewChild('raceCanvas', { static: true }) raceCanvas!: ElementRef<HTMLCanvasElement>;
  
  engine!: Matter.Engine;
  render!: Matter.Render;
  runner!: Matter.Runner;
  
  participants: Participant[] = [];
  
  raceStarted = false;
  raceFinished = false;
  startTime = 0;
  
  results: { participant: Participant, color: string, time: number }[] = [];
  
  private colors = [
    '#ff3b30', '#ff9500', '#ffcc00', '#4cd964', 
    '#5ac8fa', '#007aff', '#5856d6', '#ff2d55',
    '#ffffff', '#8e8e93', '#ff8a65', '#06b6d4'
  ];

  private marbleBodies: { body: Matter.Body, participant: Participant, color: string, finished: boolean }[] = [];

  constructor(public participantService: ParticipantService, private router: Router) {}

  ngOnInit() {
    this.participants = [...this.participantService.participants];
    if (this.participants.length === 0) {
      this.router.navigate(['/']);
      return;
    }
    setTimeout(() => this.initPhysics(), 100);
  }

  ngOnDestroy() {
    if (this.render) {
      Matter.Render.stop(this.render);
      this.render.canvas.remove();
    }
    if (this.runner) {
      Matter.Runner.stop(this.runner);
    }
    if (this.engine) {
      Matter.Engine.clear(this.engine);
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }

  initPhysics() {
    const canvas = this.raceCanvas.nativeElement;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;

    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Composite = Matter.Composite,
          Bodies = Matter.Bodies,
          Events = Matter.Events;

    this.engine = Engine.create();
    this.engine.gravity.y = 0.8; 

    this.render = Render.create({
      canvas: canvas,
      engine: this.engine,
      options: {
        width,
        height,
        background: 'transparent',
        wireframes: false,
        showVelocity: false
      }
    });

    Render.run(this.render);
    this.runner = Runner.create();
    Runner.run(this.runner, this.engine);

    // Walls
    const wallOptions = { isStatic: true, render: { fillStyle: '#8b4513' } };
    Composite.add(this.engine.world, [
      Bodies.rectangle(width / 2, -500, width, 20, wallOptions), // Top
      Bodies.rectangle(width / 2, height, width, 20, wallOptions), // Bottom
      Bodies.rectangle(0, height / 2, 20, height + 1000, wallOptions), // Left
      Bodies.rectangle(width, height / 2, 20, height + 1000, wallOptions) // Right
    ]);

    // Create Obstacles (Pins/Pegs)
    const rows = 8;
    const cols = 7;
    const spacingX = width / cols;
    const spacingY = (height - 150) / rows; 

    for (let row = 0; row < rows; row++) {
      const offsetX = (row % 2 === 0) ? spacingX / 2 : 0;
      for (let col = 0; col < cols; col++) {
        const x = col * spacingX + offsetX;
        const y = row * spacingY + 80;
        
        const radius = 6 + Math.random() * 6;
        
        const peg = Bodies.circle(x, y, radius, {
          isStatic: true,
          render: { fillStyle: '#ff8c00' },
          restitution: 0.6,
          friction: 0.1
        });
        Composite.add(this.engine.world, peg);
      }
    }

    const funnelLeft = Bodies.rectangle(width * 0.2, height - 80, width * 0.5, 20, {
      isStatic: true,
      angle: Math.PI / 6,
      render: { fillStyle: '#8b4513' }
    });
    const funnelRight = Bodies.rectangle(width * 0.8, height - 80, width * 0.5, 20, {
      isStatic: true,
      angle: -Math.PI / 6,
      render: { fillStyle: '#8b4513' }
    });
    Composite.add(this.engine.world, [funnelLeft, funnelRight]);

    // Finish Line Sensor
    const finishLine = Bodies.rectangle(width / 2, height - 20, width, 40, {
      isStatic: true,
      isSensor: true,
      label: 'finishLine',
      render: { fillStyle: 'rgba(0, 255, 0, 0.3)' }
    });
    Composite.add(this.engine.world, finishLine);

    this.participants.forEach((p, index) => {
      const radius = 12;
      const color = this.colors[index % this.colors.length];
      const startX = (width / 2) + (Math.random() * 200 - 100); 
      
      const marble = Bodies.circle(startX, -100 - (Math.random() * 100), radius, {
        restitution: 0.9,
        friction: 0.001,
        frictionAir: 0.02,
        density: 0.05 + Math.random() * 0.02, 
        label: `marble-${index}`,
        render: {
          fillStyle: color,
          strokeStyle: '#fff',
          lineWidth: 2
        }
      });

      this.marbleBodies.push({
        body: marble,
        participant: p,
        color: color,
        finished: false
      });
    });

    Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        if (bodyA.label === 'finishLine' || bodyB.label === 'finishLine') {
          const marbleBody = bodyA.label.startsWith('marble-') ? bodyA : bodyB;
          const marbleObj = this.marbleBodies.find(m => m.body.id === marbleBody.id);
          
          if (marbleObj && !marbleObj.finished) {
            marbleObj.finished = true;
            const timeElapsed = (Date.now() - this.startTime) / 1000;
            this.results.push({
              participant: marbleObj.participant,
              color: marbleObj.color,
              time: timeElapsed
            });

            if (this.results.length === this.participants.length) {
              this.raceFinished = true;
            }
          }
        }
      }
    });

    Events.on(this.render, 'afterRender', () => {
      const context = this.render.context;
      context.font = 'bold 12px Outfit, Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#ffffff';

      this.marbleBodies.forEach(m => {
        if (!m.finished && m.body.position.y > -50) {
          const shortName = m.participant.name.substring(0, 3).toUpperCase();
          context.fillText(shortName, m.body.position.x, m.body.position.y - 18);
        }
      });
    });
  }

  startRace() {
    this.raceStarted = true;
    this.startTime = Date.now();
    const bodies = this.marbleBodies.map(m => m.body);
    Matter.Composite.add(this.engine.world, bodies);
  }
}

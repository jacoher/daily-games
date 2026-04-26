import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ParticipantService } from '../participant.service';
import { SoundService } from '../sound.service';
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
        <h2 class="race-title">🔴 Carrera en Marte 3D 🔴</h2>
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
      background: #0a0402; /* Will be covered by global space bg */
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
      color: #ff8c42;
      text-shadow: 0 0 15px rgba(255, 140, 66, 0.8);
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
      height: 75vh;
      border: 6px solid #8b3a20;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,0.8), inset 0 0 50px rgba(0,0,0,0.9);
      background: transparent;
    }
    canvas {
      position: relative;
      z-index: 2;
      display: block;
      width: 100%;
      height: 100%;
    }
    .results-modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(20, 5, 2, 0.95);
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

  private marbleBodies: { body: Matter.Body, participant: Participant, color: string, finished: boolean, radius: number }[] = [];
  private spinners: Matter.Body[] = [];
  private rocks: Matter.Body[] = [];
  private animals: { body: Matter.Body, emoji: string, dir: number, speed: number }[] = [];

  private cameraY = 0;

  constructor(
    public participantService: ParticipantService, 
    private soundService: SoundService,
    private router: Router
  ) {}

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
    const viewHeight = canvas.parentElement?.clientHeight || 600;
    
    // Massive track length
    const trackHeight = 4000; 

    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Composite = Matter.Composite,
          Bodies = Matter.Bodies,
          Constraint = Matter.Constraint,
          Body = Matter.Body,
          Events = Matter.Events;

    this.engine = Engine.create();
    this.engine.gravity.y = 1.2; 

    // Make canvas logical size match its CSS size to avoid blurriness
    canvas.width = width;
    canvas.height = viewHeight;

    this.render = Render.create({
      canvas: canvas,
      engine: this.engine,
      options: {
        width,
        height: viewHeight,
        background: 'transparent',
        wireframes: false,
        showVelocity: false
      }
    });

    Render.run(this.render);
    this.runner = Runner.create();
    Runner.run(this.runner, this.engine);

    // Walls
    const wallOptions = { 
      isStatic: true, 
      render: { fillStyle: '#3d160c', strokeStyle: '#260c05', lineWidth: 4 },
      restitution: 0.5
    };
    Composite.add(this.engine.world, [
      Bodies.rectangle(width / 2, -500, width, 20, wallOptions), // Top lid
      Bodies.rectangle(width / 2, trackHeight + 50, width, 100, wallOptions), // Bottom buffer
      Bodies.rectangle(-20, trackHeight / 2, 40, trackHeight * 1.5, wallOptions), // Left
      Bodies.rectangle(width + 20, trackHeight / 2, 40, trackHeight * 1.5, wallOptions) // Right
    ]);

    // Distribute Obstacles (Rocks/Polygons) across the entire 4000px height
    const rockRows = 40; 
    const rockCols = 5;
    const spacingX = width / rockCols;
    const spacingY = (trackHeight - 400) / rockRows; 

    for (let row = 0; row < rockRows; row++) {
      const offsetX = (row % 2 === 0) ? spacingX / 2 : 0;
      for (let col = 0; col < rockCols + 1; col++) {
        const x = col * spacingX + offsetX;
        const y = row * spacingY + 200;
        
        // Skip some to create holes
        if (Math.random() > 0.6) continue;

        const sides = Math.floor(Math.random() * 4) + 5; 
        const radius = 15 + Math.random() * 20; // Big rocks
        
        const rock = Bodies.polygon(x, y, sides, radius, {
          isStatic: true,
          render: { visible: false }, 
          restitution: 0.4,
          friction: 0.2
        });
        this.rocks.push(rock);
        Composite.add(this.engine.world, rock);
      }
    }

    // Add Motorized Propellers (Hélices)
    const numPropellers = 15;
    for (let i = 0; i < numPropellers; i++) {
      const px = width * (0.2 + (Math.random() * 0.6));
      // Spread them from y=400 down to y=3600
      const py = 400 + (i * (3200 / numPropellers)) + (Math.random() * 100 - 50);
      
      const spinner = Bodies.rectangle(px, py, 150 + Math.random() * 50, 20, {
        restitution: 0.8,
        friction: 0.1,
        render: { visible: false }, 
        collisionFilter: { group: -1 } 
      });
      
      const constraint = Constraint.create({
        pointA: { x: px, y: py },
        bodyB: spinner,
        length: 0,
        stiffness: 1,
        render: { visible: false }
      });
      
      this.spinners.push(spinner);
      Composite.add(this.engine.world, [spinner, constraint]);
    }

    // Add Animals (Aliens/Scorpions)
    const animalEmojis = ['🦂', '👽', '👾', '🕷️', '🐕', '🦀'];
    const numAnimals = 10;
    for (let i = 0; i < numAnimals; i++) {
      const startX = width * 0.5;
      const startY = 500 + (i * (3000 / numAnimals));
      
      const animalBody = Bodies.circle(startX, startY, 25, {
        isStatic: false,
        restitution: 1.2, // Bouncy
        friction: 0,
        frictionAir: 0,
        density: 1000, // Unmovable by marbles
        render: { visible: false }
      });
      Body.set(animalBody, 'ignoreGravity', true);

      this.animals.push({
        body: animalBody,
        emoji: animalEmojis[Math.floor(Math.random() * animalEmojis.length)],
        dir: i % 2 === 0 ? 1 : -1,
        speed: 2 + Math.random() * 3
      });
      Composite.add(this.engine.world, animalBody);
    }

    // Funnels at the bottom
    const funnelLeft = Bodies.rectangle(width * 0.15, trackHeight - 150, width * 0.6, 40, {
      isStatic: true,
      angle: Math.PI / 3.5, // Steeper angle
      friction: 0, // No friction so they slide perfectly
      render: { fillStyle: '#3d160c', strokeStyle: '#1a0803', lineWidth: 4 }
    });
    const funnelRight = Bodies.rectangle(width * 0.85, trackHeight - 150, width * 0.6, 40, {
      isStatic: true,
      angle: -Math.PI / 3.5,
      friction: 0,
      render: { fillStyle: '#3d160c', strokeStyle: '#1a0803', lineWidth: 4 }
    });
    Composite.add(this.engine.world, [funnelLeft, funnelRight]);

    // Finish Line Sensor
    const finishLine = Bodies.rectangle(width / 2, trackHeight - 20, width * 1.5, 40, {
      isStatic: true,
      isSensor: true,
      label: 'finishLine',
      render: { fillStyle: 'rgba(0, 255, 0, 0.3)' }
    });
    Composite.add(this.engine.world, finishLine);

    // Prepare Marbles 
    this.participants.forEach((p, index) => {
      const radius = 20; 
      const color = this.colors[index % this.colors.length];
      const startX = (width / 2) + (Math.random() * 300 - 150); 
      
      const marble = Bodies.circle(startX, -100 - (Math.random() * 300), radius, {
        restitution: 0.7,
        friction: 0.005,
        frictionAir: 0.015,
        density: 0.05 + Math.random() * 0.02, 
        label: `marble-${index}`,
        render: {
          visible: false 
        }
      });

      this.marbleBodies.push({
        body: marble,
        participant: p,
        color: color,
        finished: false,
        radius: radius
      });
    });

    // Detect Collisions
    Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        // Finish Line Logic
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
            this.soundService.playWinnerSound();

            if (this.results.length === this.participants.length) {
              this.raceFinished = true;
            }
          }
        } 
        else {
          const marbleObjA = this.marbleBodies.find(m => m.body.id === bodyA.id);
          const marbleObjB = this.marbleBodies.find(m => m.body.id === bodyB.id);
          if (marbleObjA || marbleObjB) {
            const velA = bodyA.velocity;
            const velB = bodyB.velocity;
            const relVel = Math.abs((velA.x - velB.x) + (velA.y - velB.y));
            if (relVel > 4) {
              this.soundService.playClack(relVel);
            }
          }
        }
      }
    });

    // CAMERA LOGIC & MOTORS
    Events.on(this.engine, 'beforeUpdate', () => {
      
      // Update Propellers
      this.spinners.forEach((spinner, index) => {
        const dir = index % 2 === 0 ? 1 : -1;
        Body.setAngularVelocity(spinner, 0.15 * dir);
      });

      // Update Animals
      this.animals.forEach(animal => {
        Body.setVelocity(animal.body, { x: animal.speed * animal.dir, y: -this.engine.gravity.y });
        if (animal.body.position.x > width - 30) animal.dir = -1;
        else if (animal.body.position.x < 30) animal.dir = 1;
      });

      // Camera Tracking
      if (this.raceStarted) {
        // Find the lowest active marble
        let lowestY = -1000;
        let activeCount = 0;
        this.marbleBodies.forEach(m => {
          if (!m.finished) {
            activeCount++;
            if (m.body.position.y > lowestY) {
              lowestY = m.body.position.y;
            }
          }
        });

        if (activeCount > 0) {
          // Keep the lowest marble slightly below the center of the screen
          let targetY = lowestY - (viewHeight * 0.6);
          // Clamp camera so it doesn't show past the bottom wall
          const maxCameraY = trackHeight - viewHeight + 100;
          targetY = Math.max(-200, Math.min(targetY, maxCameraY));
          
          // Smooth interpolation
          this.cameraY += (targetY - this.cameraY) * 0.08;

          // Apply to Matter.js renderer bounds
          Matter.Render.lookAt(this.render, {
            min: { x: 0, y: this.cameraY },
            max: { x: width, y: this.cameraY + viewHeight }
          });
        }
      }
    });

    // Custom Pseudo-3D Rendering
    Events.on(this.render, 'afterRender', () => {
      const context = this.render.context;
      
      // Since lookAt modifies render.bounds, we apply it to our custom drawing
      context.save();
      // Matter.js resets transform before afterRender. We must re-apply the translation.
      const scaleX = canvas.width / (this.render.bounds.max.x - this.render.bounds.min.x);
      const scaleY = canvas.height / (this.render.bounds.max.y - this.render.bounds.min.y);
      context.scale(scaleX, scaleY);
      context.translate(-this.render.bounds.min.x, -this.render.bounds.min.y);

      // Draw Rocks
      this.rocks.forEach(rock => {
        // Only draw if visible in camera
        if (rock.bounds.max.y < this.cameraY || rock.bounds.min.y > this.cameraY + viewHeight) return;

        context.beginPath();
        rock.vertices.forEach((v, i) => {
          if (i === 0) context.moveTo(v.x, v.y);
          else context.lineTo(v.x, v.y);
        });
        context.closePath();
        
        const grad = context.createLinearGradient(rock.bounds.min.x, rock.bounds.min.y, rock.bounds.max.x, rock.bounds.max.y);
        grad.addColorStop(0, '#8c7368');
        grad.addColorStop(1, '#402a22');
        context.fillStyle = grad;
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = '#2b1b15';
        context.stroke();
      });

      // Draw Spinners
      this.spinners.forEach(spinner => {
        if (spinner.bounds.max.y < this.cameraY || spinner.bounds.min.y > this.cameraY + viewHeight) return;

        context.save();
        context.translate(spinner.position.x, spinner.position.y);
        context.rotate(spinner.angle);
        
        const w = 150;
        const h = 20;
        
        context.fillStyle = 'rgba(0,0,0,0.5)';
        context.fillRect(-w/2 + 5, -h/2 + 10, w, h);
        
        const grad = context.createLinearGradient(-w/2, -h/2, w/2, h/2);
        grad.addColorStop(0, '#fca311');
        grad.addColorStop(1, '#d62828');
        context.fillStyle = grad;
        context.fillRect(-w/2, -h/2, w, h);
        context.strokeStyle = '#000';
        context.strokeRect(-w/2, -h/2, w, h);
        
        context.beginPath();
        context.arc(0, 0, 10, 0, Math.PI * 2);
        context.fillStyle = '#666';
        context.fill();
        context.stroke();

        context.restore();
      });

      // Draw Animals
      this.animals.forEach(animal => {
        if (animal.body.position.y < this.cameraY || animal.body.position.y > this.cameraY + viewHeight) return;

        context.font = '50px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        context.shadowColor = 'rgba(0,0,0,0.8)';
        context.shadowBlur = 10;
        context.shadowOffsetY = 15;
        
        context.save();
        context.translate(animal.body.position.x, animal.body.position.y);
        if (animal.dir === -1) {
          context.scale(-1, 1);
        }
        context.fillText(animal.emoji, 0, 0);
        context.restore();
        
        context.shadowBlur = 0;
        context.shadowOffsetY = 0;
      });

      // Draw Marbles
      this.marbleBodies.forEach(m => {
        if (m.finished) return;
        
        const pos = m.body.position;
        const r = m.radius;

        context.beginPath();
        context.ellipse(pos.x + 5, pos.y + r + 5, r, r * 0.4, 0, 0, Math.PI * 2);
        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fill();

        const grad = context.createRadialGradient(
          pos.x - r * 0.3, pos.y - r * 0.3, r * 0.1, 
          pos.x, pos.y, r
        );
        grad.addColorStop(0, '#ffffff'); 
        grad.addColorStop(0.3, m.color); 
        grad.addColorStop(1, '#000000'); 

        context.beginPath();
        context.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        context.fillStyle = grad;
        context.fill();

        context.save();
        context.translate(pos.x, pos.y);
        context.rotate(m.body.angle);
        context.beginPath();
        context.moveTo(0, -r);
        context.lineTo(0, r);
        context.moveTo(-r, 0);
        context.lineTo(r, 0);
        context.strokeStyle = 'rgba(255,255,255,0.3)';
        context.lineWidth = 2;
        context.stroke();
        context.restore();

        if (pos.y > this.cameraY - 50) {
          const fullName = m.participant.name;
          context.font = 'bold 14px Arial'; 
          context.textAlign = 'center';
          context.fillStyle = '#ffffff';
          context.shadowColor = 'rgba(0,0,0,0.8)';
          context.shadowBlur = 4;
          context.fillText(fullName, pos.x, pos.y - r - 10);
          context.shadowBlur = 0; 
        }
      });

      context.restore(); // Restore the camera transform
    });
  }

  startRace() {
    this.raceStarted = true;
    this.startTime = Date.now();
    const bodies = this.marbleBodies.map(m => m.body);
    Matter.Composite.add(this.engine.world, bodies);
  }
}

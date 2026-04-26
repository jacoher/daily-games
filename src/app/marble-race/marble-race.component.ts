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
        <div class="dirt-overlay"></div>
        
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
      background: #0a0402;
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
      /* Textura de tierra de marte */
      background-color: #5c2014;
      background-image: 
        radial-gradient(circle at 20% 30%, rgba(0,0,0,0.3) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(0,0,0,0.4) 0%, transparent 50%);
    }
    .dirt-overlay {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background-image: url('data:image/svg+xml;utf8,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23n)" opacity="0.15"/></svg>');
      pointer-events: none;
      z-index: 1;
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
    const height = canvas.parentElement?.clientHeight || 600;

    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Composite = Matter.Composite,
          Bodies = Matter.Bodies,
          Constraint = Matter.Constraint,
          Body = Matter.Body,
          Events = Matter.Events;

    this.engine = Engine.create();
    this.engine.gravity.y = 1.2; // A bit stronger gravity for huge marbles

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
    const wallOptions = { 
      isStatic: true, 
      render: { fillStyle: '#3d160c', strokeStyle: '#260c05', lineWidth: 4 },
      restitution: 0.5
    };
    Composite.add(this.engine.world, [
      Bodies.rectangle(width / 2, -2000, width, 20, wallOptions),
      Bodies.rectangle(width / 2, height + 50, width, 100, wallOptions), // Bottom buffer
      Bodies.rectangle(-20, height / 2, 40, height * 3, wallOptions), // Left
      Bodies.rectangle(width + 20, height / 2, 40, height * 3, wallOptions) // Right
    ]);

    // Obstacles (Rocks/Polygons)
    const rows = 6;
    const cols = 5;
    const spacingX = width / cols;
    const spacingY = (height - 300) / rows; 

    for (let row = 0; row < rows; row++) {
      const offsetX = (row % 2 === 0) ? spacingX / 2 : 0;
      for (let col = 0; col < cols + 1; col++) {
        const x = col * spacingX + offsetX;
        const y = row * spacingY + 150;
        
        // Skip some to create holes
        if (Math.random() > 0.7) continue;

        const sides = Math.floor(Math.random() * 4) + 5; // 5 to 8 sides
        const radius = 15 + Math.random() * 15; // Bigger rocks
        
        const rock = Bodies.polygon(x, y, sides, radius, {
          isStatic: true,
          render: { visible: false }, // Render custom 3D rock
          restitution: 0.4,
          friction: 0.2
        });
        this.rocks.push(rock);
        Composite.add(this.engine.world, rock);
      }
    }

    // Add Motorized Propellers (Hélices)
    for (let i = 0; i < 3; i++) {
      const px = width * (0.2 + (i * 0.3));
      const py = height * 0.3 + (Math.random() * 100 - 50);
      
      const spinner = Bodies.rectangle(px, py, 140, 20, {
        restitution: 0.8,
        friction: 0.1,
        render: { visible: false }, // Render custom 3D propeller
        collisionFilter: { group: -1 } // Prevent self collision if needed
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
    const animalEmojis = ['🦂', '👽', '👾', '🕷️', '🐕'];
    for (let i = 0; i < 2; i++) {
      const startX = width * 0.5;
      const startY = height * 0.6 + (i * 100);
      const animalBody = Bodies.circle(startX, startY, 20, {
        isStatic: false,
        restitution: 1.2, // Bouncy
        friction: 0,
        frictionAir: 0,
        density: 1000, // Unmovable by marbles
        render: { visible: false }
      });
      // Gravity doesn't affect them
      Body.set(animalBody, 'ignoreGravity', true);

      this.animals.push({
        body: animalBody,
        emoji: animalEmojis[Math.floor(Math.random() * animalEmojis.length)],
        dir: i % 2 === 0 ? 1 : -1,
        speed: 2 + Math.random() * 2
      });
      Composite.add(this.engine.world, animalBody);
    }

    // Funnels at the bottom
    const funnelLeft = Bodies.rectangle(width * 0.2, height - 120, width * 0.5, 30, {
      isStatic: true,
      angle: Math.PI / 5,
      render: { fillStyle: '#3d160c', strokeStyle: '#1a0803', lineWidth: 4 }
    });
    const funnelRight = Bodies.rectangle(width * 0.8, height - 120, width * 0.5, 30, {
      isStatic: true,
      angle: -Math.PI / 5,
      render: { fillStyle: '#3d160c', strokeStyle: '#1a0803', lineWidth: 4 }
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

    // Prepare Marbles (GIANT MARBLES)
    this.participants.forEach((p, index) => {
      const radius = 20; // Increased size
      const color = this.colors[index % this.colors.length];
      const startX = (width / 2) + (Math.random() * 300 - 150); // Wider spread
      
      const marble = Bodies.circle(startX, -100 - (Math.random() * 300), radius, {
        restitution: 0.7,
        friction: 0.005,
        frictionAir: 0.015,
        density: 0.05 + Math.random() * 0.02, 
        label: `marble-${index}`,
        render: {
          visible: false // Custom 3D rendering
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
        // Normal collision for Clack sound
        else {
          const marbleObjA = this.marbleBodies.find(m => m.body.id === bodyA.id);
          const marbleObjB = this.marbleBodies.find(m => m.body.id === bodyB.id);
          if (marbleObjA || marbleObjB) {
            // Calculate relative velocity roughly
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

    // Update Motors and Animals
    Events.on(this.engine, 'beforeUpdate', () => {
      // Rotate propellers continuously
      this.spinners.forEach((spinner, index) => {
        // Alternating directions
        const dir = index % 2 === 0 ? 1 : -1;
        Body.setAngularVelocity(spinner, 0.15 * dir);
      });

      // Move animals
      this.animals.forEach(animal => {
        // Counteract gravity if custom ignoreGravity isn't strictly honored
        Body.setVelocity(animal.body, { x: animal.speed * animal.dir, y: -this.engine.gravity.y });
        
        if (animal.body.position.x > width - 30) {
          animal.dir = -1;
        } else if (animal.body.position.x < 30) {
          animal.dir = 1;
        }
      });
    });

    // Custom Pseudo-3D Rendering
    Events.on(this.render, 'afterRender', () => {
      const context = this.render.context;

      // Draw Rocks
      this.rocks.forEach(rock => {
        context.beginPath();
        rock.vertices.forEach((v, i) => {
          if (i === 0) context.moveTo(v.x, v.y);
          else context.lineTo(v.x, v.y);
        });
        context.closePath();
        
        // 3D Rock texture
        const grad = context.createLinearGradient(rock.bounds.min.x, rock.bounds.min.y, rock.bounds.max.x, rock.bounds.max.y);
        grad.addColorStop(0, '#8c7368');
        grad.addColorStop(1, '#402a22');
        context.fillStyle = grad;
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = '#2b1b15';
        context.stroke();
      });

      // Draw Spinners (3D Cylinders/Blades)
      this.spinners.forEach(spinner => {
        context.save();
        context.translate(spinner.position.x, spinner.position.y);
        context.rotate(spinner.angle);
        
        const w = 140;
        const h = 20;
        
        // Shadow
        context.fillStyle = 'rgba(0,0,0,0.5)';
        context.fillRect(-w/2 + 5, -h/2 + 10, w, h);
        
        // Blade
        const grad = context.createLinearGradient(-w/2, -h/2, w/2, h/2);
        grad.addColorStop(0, '#fca311');
        grad.addColorStop(1, '#d62828');
        context.fillStyle = grad;
        context.fillRect(-w/2, -h/2, w, h);
        context.strokeStyle = '#000';
        context.strokeRect(-w/2, -h/2, w, h);
        
        // Center Bolt
        context.beginPath();
        context.arc(0, 0, 10, 0, Math.PI * 2);
        context.fillStyle = '#666';
        context.fill();
        context.stroke();

        context.restore();
      });

      // Draw Animals (Emojis)
      this.animals.forEach(animal => {
        context.font = '40px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Drop shadow for floating effect
        context.shadowColor = 'rgba(0,0,0,0.8)';
        context.shadowBlur = 10;
        context.shadowOffsetY = 15;
        
        // Flip horizontally based on direction
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

        // 1. Draw Drop Shadow
        context.beginPath();
        context.ellipse(pos.x + 5, pos.y + r + 5, r, r * 0.4, 0, 0, Math.PI * 2);
        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fill();

        // 2. Draw Sphere
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

        // 3. Draw Rotating Pattern
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

        // 4. Draw Name Tag
        if (pos.y > -50) {
          const shortName = m.participant.name.substring(0, 3).toUpperCase();
          context.font = 'bold 14px Arial'; // Bigger text
          context.textAlign = 'center';
          context.fillStyle = '#ffffff';
          context.shadowColor = 'rgba(0,0,0,0.8)';
          context.shadowBlur = 4;
          context.fillText(shortName, pos.x, pos.y - r - 10);
          context.shadowBlur = 0; 
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

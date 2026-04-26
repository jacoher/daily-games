import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="space-bg">
      <div class="stars"></div>
      <div class="planet planet1">🪐</div>
      <div class="planet planet2">🌕</div>
      <div class="planet planet3">🌍</div>
    </div>
    
    <div class="app-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    /* Static styles */
    .app-container {
      position: relative;
      z-index: 10;
      width: 100vw;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    
    /* Background Styles */
    .space-bg {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at center, #0b0f19 0%, #05050a 100%);
      z-index: 0;
      overflow: hidden;
    }
    .stars {
      position: absolute;
      width: 200%;
      height: 200%;
      background-image: 
        radial-gradient(1px 1px at 20px 30px, #eee, rgba(0,0,0,0)),
        radial-gradient(1px 1px at 40px 70px, #fff, rgba(0,0,0,0)),
        radial-gradient(1px 1px at 50px 160px, #ddd, rgba(0,0,0,0)),
        radial-gradient(1.5px 1.5px at 90px 40px, #fff, rgba(0,0,0,0)),
        radial-gradient(1.5px 1.5px at 130px 80px, #fff, rgba(0,0,0,0)),
        radial-gradient(2px 2px at 160px 120px, #ddd, rgba(0,0,0,0));
      background-repeat: repeat;
      background-size: 200px 200px;
      animation: moveStars 100s linear infinite;
      opacity: 0.6;
    }
    @keyframes moveStars {
      from { transform: translate(0, 0); }
      to { transform: translate(-50%, -50%); }
    }
    
    .planet {
      position: absolute;
      font-size: 5rem;
      opacity: 0.8;
      filter: drop-shadow(0 0 20px rgba(255,255,255,0.2));
    }
    .planet1 {
      top: 20%; left: -10%;
      animation: orbit1 40s linear infinite;
    }
    .planet2 {
      bottom: 20%; right: -10%;
      font-size: 8rem;
      animation: orbit2 60s linear infinite reverse;
    }
    .planet3 {
      top: 70%; left: 40%;
      font-size: 3rem;
      animation: orbit3 80s ease-in-out infinite alternate;
    }
    
    @keyframes orbit1 {
      0% { transform: translate(0, 0) rotate(0deg); }
      100% { transform: translate(120vw, 30vh) rotate(360deg); }
    }
    @keyframes orbit2 {
      0% { transform: translate(0, 0) rotate(0deg); }
      100% { transform: translate(-120vw, -30vh) rotate(-360deg); }
    }
    @keyframes orbit3 {
      0% { transform: translate(0, 0) scale(1); opacity: 0.5; }
      100% { transform: translate(20vw, -20vh) scale(1.5); opacity: 0.9; }
    }
  `]
})
export class AppComponent {}

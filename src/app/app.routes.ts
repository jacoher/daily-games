import { Routes } from '@angular/router';
import { SetupComponent } from './setup/setup.component';
import { GamePageComponent } from './game-page/game-page.component';
import { MarbleRaceComponent } from './marble-race/marble-race.component';
import { TriviaHostComponent } from './trivia/trivia-host/trivia-host.component';
import { TriviaPlayerComponent } from './trivia/trivia-player/trivia-player.component';

export const routes: Routes = [
  { path: '', component: SetupComponent },
  { path: 'roulette', component: GamePageComponent },
  { path: 'marbles', component: MarbleRaceComponent },
  { path: 'trivia', component: TriviaHostComponent },
  { path: 'trivia/play', component: TriviaPlayerComponent },
  { path: '**', redirectTo: '' }
];

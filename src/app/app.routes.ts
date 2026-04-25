import { Routes } from '@angular/router';
import { SetupComponent } from './setup/setup.component';
import { GamePageComponent } from './game-page/game-page.component';
import { MarbleRaceComponent } from './marble-race/marble-race.component';

export const routes: Routes = [
  { path: '', component: SetupComponent },
  { path: 'roulette', component: GamePageComponent },
  { path: 'marbles', component: MarbleRaceComponent },
  { path: '**', redirectTo: '' }
];

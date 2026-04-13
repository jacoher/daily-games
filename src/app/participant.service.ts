import { Injectable } from '@angular/core';
import { Participant } from './participant.model';

@Injectable({
  providedIn: 'root'
})
export class ParticipantService {
  participants: Participant[] = [
    { name: 'Alice Stark', avatarUrl: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Alice%20Stark' },
    { name: 'Bob Galaxy', avatarUrl: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Bob%20Galaxy' },
    { name: 'Charlie Orion', avatarUrl: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Charlie%20Orion' },
    { name: 'David Nebula', avatarUrl: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=David%20Nebula' },
    { name: 'Eve Pulsar', avatarUrl: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Eve%20Pulsar' }
  ];
  
  speedMultiplier = 1;

  addParticipant(name: string, avatarUrl: string) {
    if (name && !this.participants.find(p => p.name === name)) {
      this.participants.push({ name, avatarUrl });
      // Re-assign to trigger Angular change detection if necessary
      this.participants = [...this.participants];
    }
  }

  removeParticipant(index: number) {
    if (index > -1 && index < this.participants.length) {
      this.participants.splice(index, 1);
      this.participants = [...this.participants];
    }
  }
}

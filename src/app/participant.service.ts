import { Injectable } from '@angular/core';
import { Participant } from './participant.model';

@Injectable({
  providedIn: 'root'
})
export class ParticipantService {
  participants: Participant[] = [];
  speedMultiplier = 1;
  private storageKey = 'dailyGames_participants';

  constructor() {
    this.loadParticipants();
  }

  loadParticipants() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      try {
        this.participants = JSON.parse(data);
      } catch (e) {
        console.error('Error parsing participants from localStorage', e);
        this.participants = [];
      }
    } else {
      this.participants = [];
    }
  }

  private saveParticipants() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.participants));
  }

  addParticipant(name: string, avatarUrl: string) {
    if (name && !this.participants.find(p => p.name === name)) {
      this.participants = [...this.participants, { name, avatarUrl }];
      this.saveParticipants();
    }
  }

  removeParticipant(index: number) {
    if (index > -1 && index < this.participants.length) {
      this.participants = this.participants.filter((_, i) => i !== index);
      this.saveParticipants();
    }
  }
}

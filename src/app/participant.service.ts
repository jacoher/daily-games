import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Participant } from './participant.model';

@Injectable({
  providedIn: 'root'
})
export class ParticipantService {
  participants: Participant[] = [];
  speedMultiplier = 1;
  private apiUrl = 'http://localhost:3000/api/participants';

  constructor(private http: HttpClient) {
    this.loadParticipants();
  }

  loadParticipants() {
    this.http.get<{data: Participant[]}>(this.apiUrl).subscribe(response => {
      this.participants = response.data;
    });
  }

  addParticipant(name: string, avatarUrl: string) {
    if (name && !this.participants.find(p => p.name === name)) {
      // Optimistic update
      this.participants = [...this.participants, { name, avatarUrl }];
      
      this.http.post(this.apiUrl, { name, avatarUrl }).subscribe({
        next: () => this.loadParticipants(),
        error: (err) => {
          console.error('Error adding participant', err);
          this.loadParticipants(); // revert on error
        }
      });
    }
  }

  removeParticipant(index: number) {
    if (index > -1 && index < this.participants.length) {
      const pName = this.participants[index].name;
      // Optimistic update
      this.participants = this.participants.filter((_, i) => i !== index);
      
      this.http.delete(`${this.apiUrl}/${encodeURIComponent(pName)}`).subscribe({
        next: () => this.loadParticipants(),
        error: (err) => {
          console.error('Error removing participant', err);
          this.loadParticipants(); // revert on error
        }
      });
    }
  }
}

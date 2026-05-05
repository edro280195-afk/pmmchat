import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Mention } from '../models/mention.model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MentionService {
  private readonly _mentions = signal<Mention[]>([]);

  readonly mentions = this._mentions.asReadonly();
  readonly unreadCount = computed(() => this._mentions().filter(m => !m.isRead).length);

  readonly showPanel = signal(false);

  constructor(private http: HttpClient) {}

  togglePanel(): void {
    this.showPanel.update(v => !v);
  }

  async loadUnread(): Promise<void> {
    try {
      const mentions = await firstValueFrom(
        this.http.get<Mention[]>(`${environment.apiUrl}/mentions/unread`)
      );
      this._mentions.set(mentions);
    } catch (err) {
      console.error('Error al cargar menciones:', err);
    }
  }

  /** Agrega una mención recibida por SignalR en tiempo real. */
  addMention(mention: Mention): void {
    this._mentions.update(list => {
      if (list.some(m => m.id === mention.id)) return list;
      return [mention, ...list];
    });
  }

  async markAsRead(chatRoomId: number): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/mentions/read/${chatRoomId}`, {})
      );
      this._mentions.update(list =>
        list.map(m => m.chatRoomId === chatRoomId ? { ...m, isRead: true } : m)
      );
    } catch (err) {
      console.error('Error al marcar menciones como leídas:', err);
    }
  }

  clearForRoom(chatRoomId: number): void {
    this._mentions.update(list => list.filter(m => m.chatRoomId !== chatRoomId));
  }
}

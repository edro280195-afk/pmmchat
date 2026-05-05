import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UserPresence, PresenceStatus } from '../models/presence.model';
import { firstValueFrom, interval, Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PresenceService {
  /** Mapa userId → presencia. Alimentado por SignalR + carga inicial. */
  private readonly _presenceMap = signal<Map<string, UserPresence>>(new Map());
  readonly presenceMap = this._presenceMap.asReadonly();

  private heartbeatSub: Subscription | null = null;

  constructor(private http: HttpClient) {}

  // ── Consultas ──

  getPresence(userId: string): UserPresence | undefined {
    return this._presenceMap().get(userId);
  }

  getStatus(userId: string): PresenceStatus {
    return this._presenceMap().get(userId)?.status ?? 4;
  }

  // ── Actualización local (desde SignalR) ──

  updatePresence(presence: UserPresence): void {
    this._presenceMap.update(map => {
      const next = new Map(map);
      next.set(presence.userId, presence);
      return next;
    });
  }

  // ── API calls ──

  async loadForRoom(roomId: number): Promise<void> {
    try {
      const presences = await firstValueFrom(
        this.http.get<UserPresence[]>(`${environment.apiUrl}/presence/room/${roomId}`)
      );
      this._presenceMap.update(map => {
        const next = new Map(map);
        presences.forEach(p => next.set(p.userId, p));
        return next;
      });
    } catch (err) {
      console.error('Error al cargar presencia de sala:', err);
    }
  }

  async updateStatus(status: PresenceStatus, customStatus?: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`${environment.apiUrl}/presence`, { status, customStatus: customStatus ?? null })
    );
  }

  /** Inicia el heartbeat cada 60s. Llamar al autenticarse. */
  startHeartbeat(): void {
    if (this.heartbeatSub) return; // ya iniciado

    // Llamada inmediata al conectar
    this.sendHeartbeat();

    this.heartbeatSub = interval(60_000).subscribe(() => {
      this.sendHeartbeat();
    });
  }

  stopHeartbeat(): void {
    this.heartbeatSub?.unsubscribe();
    this.heartbeatSub = null;
  }

  private sendHeartbeat(): void {
    firstValueFrom(
      this.http.post(`${environment.apiUrl}/presence/heartbeat`, {})
    ).catch(err => console.warn('Heartbeat fallido:', err));
  }
}

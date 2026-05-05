import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SidebarRoom, CreateRoomRequest, Participant } from '../models/room.model';
import { firstValueFrom } from 'rxjs';
import { SignalRService } from './signalr.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly _rooms = signal<SidebarRoom[]>([]);
  private readonly _activeRoomId = signal<number | null>(null);
  private readonly _pendingParticipant = signal<Participant | null>(null);

  readonly rooms = this._rooms.asReadonly();
  readonly activeRoomId = this._activeRoomId.asReadonly();
  readonly pendingParticipant = this._pendingParticipant.asReadonly();

  constructor(private http: HttpClient, private signalRService: SignalRService) {}

  async loadRooms(): Promise<void> {
    try {
      const rooms = await firstValueFrom(
        this.http.get<SidebarRoom[]>(`${environment.apiUrl}/rooms`),
      );
      this._rooms.set(rooms);
    } catch (err) {
      console.error('Error al cargar salas:', err);
      throw err;
    }
  }

  setActiveRoom(roomId: number | null): void {
    this._activeRoomId.set(roomId);
  }

  async createRoom(request: CreateRoomRequest): Promise<SidebarRoom> {
    try {
      const room = await firstValueFrom(
        this.http.post<SidebarRoom>(`${environment.apiUrl}/rooms`, request),
      );
      // La API ya devuelve la sala completa — no hace falta refetch de todas las salas.
      this.addRoom(room);
      return room;
    } catch (err) {
      console.error('Error al crear sala:', err);
      throw err;
    }
  }

  async getParticipants(roomId: number): Promise<Participant[]> {
    try {
      return await firstValueFrom(
        this.http.get<Participant[]>(`${environment.apiUrl}/rooms/${roomId}/participants`),
      );
    } catch (err) {
      console.error('Error al obtener participantes:', err);
      throw err;
    }
  }

  async addParticipant(roomId: number, userId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/rooms/${roomId}/participants`, { userId }),
      );
    } catch (err) {
      console.error('Error al agregar participante:', err);
      throw err;
    }
  }

  async removeParticipant(roomId: number, userId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/rooms/${roomId}/participants/${userId}`),
      );
    } catch (err) {
      console.error('Error al remover participante:', err);
      throw err;
    }
  }

  async renameRoom(roomId: number, name: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/rooms/${roomId}/name`, { name }),
      );
      // Actualizar solo la sala afectada en el signal en vez de refetch completo.
      this.updateRoomInSidebar(roomId, { name });
    } catch (err) {
      console.error('Error al renombrar sala:', err);
      throw err;
    }
  }

  async deleteRoom(roomId: number): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/rooms/${roomId}`)
      );
      await this.loadRooms();
    } catch (err) {
      console.error('Error al eliminar sala:', err);
      throw err;
    }
  }

  async searchUsers(query: string): Promise<Participant[]> {
    try {
      return await firstValueFrom(
        this.http.get<Participant[]>(`${environment.apiUrl}/users/search`, {
          params: { q: query },
        }),
      );
    } catch (err) {
      console.error('Error al buscar usuarios:', err);
      throw err;
    }
  }

  async getUser(id: string): Promise<Participant> {
    try {
      return await firstValueFrom(
        this.http.get<Participant>(`${environment.apiUrl}/users/${id}`)
      );
    } catch (err) {
      console.error('Error al obtener usuario:', err);
      throw err;
    }
  }

  updateRoomInSidebar(roomId: number, updates: Partial<SidebarRoom>): void {
    this._rooms.update((rooms) =>
      rooms.map((r) => (r.id === roomId ? { ...r, ...updates } : r)),
    );
  }

  moveRoomToTop(roomId: number): void {
    this._rooms.update((rooms) => {
      const idx = rooms.findIndex((r) => r.id === roomId);
      if (idx <= 0) return rooms;
      const room = { ...rooms[idx], lastMessageAt: new Date().toISOString() };
      return [room, ...rooms.slice(0, idx), ...rooms.slice(idx + 1)];
    });
  }

  /** Agrega una sala al tope del sidebar si no existe ya (p.ej. al recibir RoomCreated vía SignalR) */
  addRoom(room: SidebarRoom): void {
    this._rooms.update((rooms) => {
      if (rooms.some(r => r.id === room.id)) return rooms;
      return [room, ...rooms];
    });
  }

  setPendingParticipant(participant: Participant | null): void {
    this._pendingParticipant.set(participant);
    if (participant) {
      this._activeRoomId.set(null);
    }
  }
}

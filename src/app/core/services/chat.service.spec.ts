import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ChatService } from './chat.service';
import { SignalRService } from './signalr.service';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ChatService,
        {
          provide: SignalRService,
          useValue: {
            joinRoom: () => Promise.resolve(),
            leaveRoom: () => Promise.resolve(),
          },
        },
      ],
    });

    service = TestBed.inject(ChatService);
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('activeRoomId', () => {
    it('should default to null', () => {
      expect(service.activeRoomId()).toBeNull();
    });

    it('should set active room', () => {
      service.setActiveRoom(5);
      expect(service.activeRoomId()).toBe(5);
    });

    it('should clear active room with null', () => {
      service.setActiveRoom(5);
      service.setActiveRoom(null);
      expect(service.activeRoomId()).toBeNull();
    });
  });

  describe('pendingParticipant', () => {
    it('should default to null', () => {
      expect(service.pendingParticipant()).toBeNull();
    });

    it('should set pending participant', () => {
      const participant = {
        userId: 'user-1',
        nombreCompleto: 'Juan Pérez',
        claveUsuario: 'PMM001',
        email: 'juan@pmm.com',
        oficina: 'Logística',
        role: 1,
        joinedAt: '2024-01-01T00:00:00Z',
      };
      service.setPendingParticipant(participant as any);
      expect(service.pendingParticipant()?.userId).toBe('user-1');
    });

    it('should clear active room when setting pending participant', () => {
      service.setActiveRoom(1);
      service.setPendingParticipant({} as any);
      expect(service.activeRoomId()).toBeNull();
    });
  });

  describe('updateRoomInSidebar', () => {
    it('should have empty rooms by default', () => {
      expect(service.rooms()).toEqual([]);
    });
  });

  describe('rooms signal', () => {
    it('should be readable', () => {
      const rooms = service.rooms();
      expect(Array.isArray(rooms)).toBe(true);
    });
  });
});
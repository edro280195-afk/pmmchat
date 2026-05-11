import { Injectable, signal, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { PresenceService } from './presence.service';
import { MentionService } from './mention.service';
import { ChatMessage, AttachmentInfo } from '../models/message.model';
import { Participant, SidebarRoom } from '../models/room.model';
import { UserPresence } from '../models/presence.model';
import { Mention } from '../models/mention.model';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;
  private joinedRooms = new Set<number>();

  readonly connected = signal(false);
  readonly reconnecting = signal(false);
  readonly disconnected = signal(false);
  readonly justReconnected = signal(false);
  private reconnectedTimer: ReturnType<typeof setTimeout> | null = null;

  // Presence tracking
  private readonly _onlineUsers = signal<Set<string>>(new Set());
  readonly onlineUsers = this._onlineUsers.asReadonly();

  // Event streams
  readonly messageReceived$ = new Subject<{ roomId: number; message: ChatMessage }>();
  readonly messageEdited$ = new Subject<{ messageId: number; content: string }>();
  readonly messageDeleted$ = new Subject<{ messageId: number }>();
  readonly attachmentAdded$ = new Subject<{ roomId: number; messageId: number; attachment: AttachmentInfo }>();
  readonly userJoined$ = new Subject<{ roomId: number; participant: Participant }>();
  readonly userLeft$ = new Subject<{ roomId: number; userId: string }>();
  readonly userTyping$ = new Subject<{ roomId: number; userId: string; userName: string; isTyping: boolean }>();
  readonly reactionAdded$ = new Subject<{ roomId: number; messageId: number; userId: string; userName: string; emoji: string }>();
  readonly reactionRemoved$ = new Subject<{ roomId: number; messageId: number; userId: string; emoji: string }>();
  readonly roomRenamed$ = new Subject<{ roomId: number; name: string }>();
  readonly roomRead$ = new Subject<{ roomId: number; userId: string; readAt: string }>();
  readonly roomCreated$ = new Subject<SidebarRoom>();
  readonly messagePinned$ = new Subject<{ roomId: number; messageId: number; isPinned: boolean }>();
  readonly messageUnpinned$ = new Subject<{ roomId: number; messageId: number }>();

  constructor(
    private authService: AuthService,
    private ngZone: NgZone,
    private presenceService: PresenceService,
    private mentionService: MentionService,
  ) {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  isUserOnline(userId: string): boolean {
    return this._onlineUsers().has(userId);
  }

  async start(): Promise<void> {
    const token = this.authService.getToken();
    if (!token) return;
    
    // Si ya hay una conexión activa, detenerla primero
    if (this.hubConnection) {
      await this.stop();
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.signalrUrl, {
        // Usar función que lee el token actual en cada intento de conexión/reconexión,
        // en lugar de capturar el string en el closure (que quedaría stale si se refreshea el token).
        accessTokenFactory: () => this.authService.getToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.registerHandlers();

    this.hubConnection.onreconnecting(() => {
      this.ngZone.run(() => {
        this.connected.set(false);
        this.reconnecting.set(true);
        this.disconnected.set(false);
      });
    });

    this.hubConnection.onreconnected(async () => {
      this.ngZone.run(() => {
        this.connected.set(true);
        this.reconnecting.set(false);
        this.disconnected.set(false);

        // Re-registrar handlers (off+on dentro de registerHandlers evita duplicados)
        this.registerHandlers();

        // Flash "reconnected" banner for 3 seconds
        this.justReconnected.set(true);
        if (this.reconnectedTimer) clearTimeout(this.reconnectedTimer);
        this.reconnectedTimer = setTimeout(() => {
          this.ngZone.run(() => this.justReconnected.set(false));
        }, 3000);
      });

      // Re-join rooms en paralelo — mucho más rápido que secuencial cuando hay muchas salas.
      // Las salas que ya no existen (HubException) se eliminan del Set.
      const joinResults = await Promise.allSettled(
        Array.from(this.joinedRooms).map(async (roomId) => {
          await this.hubConnection?.invoke('JoinRoom', roomId);
          return roomId;
        })
      );
      joinResults.forEach((result, idx) => {
        if (result.status === 'rejected') {
          this.joinedRooms.delete(Array.from(this.joinedRooms)[idx]);
        }
      });

      // Re-fetch online users
      await this.fetchOnlineUsers();
    });

    this.hubConnection.onclose(() => {
      this.ngZone.run(() => {
        this.connected.set(false);
        this.reconnecting.set(false);
        this.disconnected.set(true);
      });
      
      // Intentar reconectar manualmente cada 5 segundos si falla el automático
      this.startReconnectionLoop();
    });

    try {
      await this.hubConnection.start();
      this.ngZone.run(() => {
        this.connected.set(true);
        this.disconnected.set(false);
        this.reconnecting.set(false);
      });
      // Fetch initial online users list
      await this.fetchOnlineUsers();
    } catch (err) {
      console.error('SignalR connection error:', err);
      this.connected.set(false);
      this.disconnected.set(true);
      // Intentar reconectar manualmente
      this.startReconnectionLoop();
    }
  }

  private reconnectionTimer: ReturnType<typeof setInterval> | null = null;
  
  private startReconnectionLoop(): void {
    if (this.reconnectionTimer) return;
    
    this.reconnectionTimer = setInterval(async () => {
      if (!this.hubConnection) return;
      
      try {
        await this.hubConnection.start();
        // Si llegamos aquí, la conexión fue exitosa
        this.ngZone.run(() => {
          this.connected.set(true);
          this.disconnected.set(false);
          this.reconnecting.set(false);
        });
        
        if (this.reconnectionTimer) {
          clearInterval(this.reconnectionTimer);
          this.reconnectionTimer = null;
        }
      } catch {
        // Seguir intentando...
        console.log('Reintentando conexión SignalR...');
      }
    }, 5000); // Reintentar cada 5 segundos
  }

  private async fetchOnlineUsers(): Promise<void> {
    if (!this.hubConnection) return;
    try {
      const userIds: string[] = await this.hubConnection.invoke('GetOnlineUsers');
      this._onlineUsers.set(new Set(userIds));
    } catch (err) {
      console.error('Failed to get online users:', err);
    }
  }

  async joinRoom(roomId: number): Promise<void> {
    if (!this.hubConnection || this.joinedRooms.has(roomId)) return;
    await this.hubConnection.invoke('JoinRoom', roomId);
    this.joinedRooms.add(roomId);
  }

  async sendTyping(roomId: number, isTyping: boolean): Promise<void> {
    if (!this.hubConnection) return;
    await this.hubConnection.invoke('Typing', roomId, isTyping);
  }

  async leaveRoom(roomId: number): Promise<void> {
    if (!this.hubConnection || !this.joinedRooms.has(roomId)) return;
    await this.hubConnection.invoke('LeaveRoom', roomId);
    this.joinedRooms.delete(roomId);
  }

  async stop(): Promise<void> {
    this.joinedRooms.clear();
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = null;
    }
    this.connected.set(false);
    this.disconnected.set(false);
    this.reconnecting.set(false);
    this._onlineUsers.set(new Set());
  }

  private readonly handlerNames = [
    'UserOnline', 'UserOffline', 'RoomRead',
    'ReceiveMessage', 'MessageEdited', 'MessageDeleted', 'AttachmentAdded',
    'UserJoinedRoom', 'UserLeftRoom', 'UserTyping',
    'ReactionAdded', 'ReactionRemoved', 'RoomRenamed', 'RoomCreated',
    'PresenceChanged', 'YouWereMentioned',
    'MessagePinned', 'MessageUnpinned',
  ] as const;

  private registerHandlers(): void {
    if (!this.hubConnection) return;

    // Desregistrar primero para evitar duplicados en reconexión
    this.handlerNames.forEach(name => this.hubConnection!.off(name));

    // ── Presence ──
    this.hubConnection.on('UserOnline', (userId: string) => {
      this.ngZone.run(() => {
        this._onlineUsers.update((set) => {
          const next = new Set(set);
          next.add(userId);
          return next;
        });
      });
    });

    this.hubConnection.on('UserOffline', (data: { userId: string; lastSeen: string }) => {
      this.ngZone.run(() => {
        this._onlineUsers.update((set) => {
          const next = new Set(set);
          next.delete(data.userId);
          return next;
        });
      });
    });



    this.hubConnection.on('RoomRead', (data: { roomId: number; userId: string; readAt: string }) => {
      this.ngZone.run(() => this.roomRead$.next(data));
    });

    // ── Messages ──
    this.hubConnection.on('ReceiveMessage', (data: { roomId: number; message: ChatMessage }) => {
      this.ngZone.run(() => {
        this.messageReceived$.next(data);
      });
    });

    this.hubConnection.on('MessageEdited', (data: { roomId: number; messageId: number; content: string }) => {
      this.ngZone.run(() => this.messageEdited$.next(data));
    });

    this.hubConnection.on('MessageDeleted', (data: { roomId: number; messageId: number }) => {
      this.ngZone.run(() => this.messageDeleted$.next(data));
    });

    this.hubConnection.on('AttachmentAdded', (data: { roomId: number; messageId: number; attachment: AttachmentInfo }) => {
      this.ngZone.run(() => this.attachmentAdded$.next(data));
    });

    this.hubConnection.on('UserJoinedRoom', (data: { roomId: number; participant: Participant }) => {
      this.ngZone.run(() => this.userJoined$.next(data));
    });

    this.hubConnection.on('UserLeftRoom', (data: { roomId: number; userId: string }) => {
      this.ngZone.run(() => this.userLeft$.next(data));
    });

    this.hubConnection.on('UserTyping', (data: { roomId: number; userId: string; userName: string; isTyping: boolean }) => {
      this.ngZone.run(() => this.userTyping$.next(data));
    });

    this.hubConnection.on('ReactionAdded', (data: { roomId: number; messageId: number; userId: string; userName: string; emoji: string }) => {
      this.ngZone.run(() => this.reactionAdded$.next(data));
    });

    this.hubConnection.on('ReactionRemoved', (data: { roomId: number; messageId: number; userId: string; emoji: string }) => {
      this.ngZone.run(() => this.reactionRemoved$.next(data));
    });

    this.hubConnection.on('RoomRenamed', (data: { roomId: number; name: string }) => {
      this.ngZone.run(() => this.roomRenamed$.next(data));
    });

    this.hubConnection.on('RoomCreated', (room: any) => {
      this.ngZone.run(() => this.roomCreated$.next(room));
    });

    this.hubConnection.on('MessagePinned', (data: { roomId: number; messageId: number; isPinned: boolean }) => {
      this.ngZone.run(() => this.messagePinned$.next(data));
    });

    this.hubConnection.on('MessageUnpinned', (data: { roomId: number; messageId: number }) => {
      this.ngZone.run(() => this.messageUnpinned$.next(data));
    });

    // ── Presencia ──
    this.hubConnection.on('PresenceChanged', (presence: UserPresence) => {
      this.ngZone.run(() => {
        this.presenceService.updatePresence(presence);
      });
    });

    // ── @Menciones ──
    this.hubConnection.on('YouWereMentioned', (mention: Mention) => {
      this.ngZone.run(() => {
        this.mentionService.addMention(mention);

        // Notificación nativa del SO
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Te mencionaron en ${mention.roomName}`, {
            body: `${mention.senderName}: ${mention.messageContent}`,
            icon: '/favicon.ico',
          });
        }
      });
    });
  }
}

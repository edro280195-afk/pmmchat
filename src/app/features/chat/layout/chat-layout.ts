import { Component, OnInit, OnDestroy, signal, inject, computed, effect, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Settings } from '../settings/settings';
import { MentionsPanel } from '../mentions-panel/mentions-panel';
import { ToastComponent } from '../../../shared/components/toast/toast';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal';
import { ImageGalleryComponent } from '../../../shared/components/image-gallery/image-gallery';

import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemeService } from '../../../core/services/theme.service';
import { PresenceService } from '../../../core/services/presence.service';
import { MentionService } from '../../../core/services/mention.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import gsap from 'gsap';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, Settings, MentionsPanel, ToastComponent, ConfirmModalComponent, ImageGalleryComponent],
  templateUrl: './chat-layout.html',
  styleUrl: './chat-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatLayout implements OnInit, OnDestroy, AfterViewInit {
  public authService = inject(AuthService);
  public chatService = inject(ChatService);
  private signalRService = inject(SignalRService);
  private notificationService = inject(NotificationService);
  private themeService = inject(ThemeService);
  private presenceService = inject(PresenceService);
  private mentionService = inject(MentionService);
  private router = inject(Router);

  showSettings = signal(false);
  readonly showMentionsPanel = this.mentionService.showPanel;

  readonly mentionCount = this.mentionService.unreadCount;
  readonly isGroupActive = computed(() => {
    const activeId = this.chatService.activeRoomId();
    if (!activeId) return false;
    const room = this.chatService.rooms().find(r => r.id === activeId);
    return room?.type === 2; // 2 = Group
  });

  // Exponer el estado de reconexión para el banner en el template
  readonly isReconnecting = this.signalRService.reconnecting;
  readonly isDisconnected = this.signalRService.disconnected;
  readonly justReconnected = this.signalRService.justReconnected;
  readonly sessionDisplaced = this.authService.sessionDisplaced;

  // Suma reactiva de mensajes no leídos
  private readonly totalUnread = computed(() =>
    this.chatService.rooms().reduce((sum, r) => sum + (r.unreadCount ?? 0), 0)
  );

  @ViewChild('bgCanvas') bgCanvas!: ElementRef<HTMLCanvasElement>;

  constructor() {
    // Actualiza el título de la pestaña reactivamente
    effect(() => {
      const n = this.totalUnread();
      document.title = n > 0 ? `(${n}) PMMChat` : 'PMMChat';
    });
  }

  private subs: Subscription[] = [];

  async ngOnInit(): Promise<void> {
    // Reclamar la sesión
    this.authService.claimSession();

    await this.chatService.loadRooms();
    await this.signalRService.start();
    await this.notificationService.init();

    // Cargar menciones no leídas al iniciar
    await this.mentionService.loadUnread();

    // Heartbeat de presencia cada 60s
    this.presenceService.startHeartbeat();

    const rooms = this.chatService.rooms();
    await Promise.all(rooms.map(r => this.signalRService.joinRoom(r.id)));

    this.subs.push(
      this.signalRService.messageReceived$.subscribe(({ roomId, message }) => {
        // Actualizar preview del sidebar
        this.chatService.updateRoomInSidebar(roomId, {
          lastMessageAt: message.sentAt,
          lastMessagePreview: message.content || '📎 Archivo adjunto',
          lastSenderName: message.senderName
        });

        // Solo notificar mensajes de otros usuarios
        const isOwnMessage = message.senderId === this.authService.user()?.userId;
        if (!isOwnMessage && this.chatService.activeRoomId() !== roomId) {
          const room = this.chatService.rooms().find(r => r.id === roomId);
          this.chatService.updateRoomInSidebar(roomId, {
            unreadCount: (room?.unreadCount ?? 0) + 1
          });

          this.themeService.playNotificationSound();

          if (this.themeService.notificationsEnabled()) {
            this.notificationService.notify(
              message.senderName,
              message.content || '📎 Archivo adjunto',
              () => {
                this.chatService.setActiveRoom(roomId);
                this.router.navigate(['/chat', roomId]);
              },
              'notification'
            );
          }
        }
      }),
    );

    this.subs.push(
      this.signalRService.roomRenamed$.subscribe(({ roomId, name }) => {
        this.chatService.updateRoomInSidebar(roomId, { name });
      }),
    );

    this.subs.push(
      this.signalRService.roomCreated$.subscribe(async (room) => {
        this.chatService.addRoom(room);
        await this.signalRService.joinRoom(room.id);
      }),
    );
  }

  ngAfterViewInit(): void {
    this.initCanvasBackground();
    this.startInitialTimeline();
  }

  private startInitialTimeline(): void {
    // Esconder elementos inicialmente para la animación
    gsap.set('.chat-layout__sidebar', { opacity: 0, x: -20 });
    gsap.set('.chat-layout__main', { opacity: 0 });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // 1. Aparece el layout principal y sidebar entra
    tl.to('.chat-layout__main', { opacity: 1, duration: 0.5 }, 0)
      .to('.chat-layout__sidebar', { opacity: 1, x: 0, duration: 0.6 }, 0);
  }

  private initCanvasBackground(): void {
    const canvas = this.bgCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W: number, H: number;
    let orbs: any[] = [];
    let grid = { cols: 0, rows: 0, cells: [] as any[] };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      W = canvas.width = parent.clientWidth;
      H = canvas.height = parent.clientHeight;
      buildGrid();
    };

    const buildGrid = () => {
      const spacing = 48;
      grid.cols = Math.ceil(W / spacing) + 1;
      grid.rows = Math.ceil(H / spacing) + 1;
      grid.cells = [];
      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          grid.cells.push({ x: c * spacing, y: r * spacing, a: Math.random() });
        }
      }
    };

    const initOrbs = () => {
      orbs = Array.from({length: 6}, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 180 + Math.random() * 220,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        hue: Math.random() > 0.5 ? 260 : 200,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      /* grid dots */
      grid.cells.forEach(cell => {
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, 1, 0, Math.PI * 2);
        // Usar variables CSS para adaptar al tema si es posible, o colores fijos suaves
        ctx.fillStyle = `rgba(120, 100, 255, ${cell.a * 0.07})`;
        ctx.fill();
      });

      /* orbs */
      orbs.forEach(o => {
        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        grad.addColorStop(0, `hsla(${o.hue}, 80%, 65%, 0.045)`);
        grad.addColorStop(1, `hsla(${o.hue}, 80%, 65%, 0)`);
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        o.x += o.vx; o.y += o.vy;
        if (o.x < -o.r) o.x = W + o.r;
        if (o.x > W + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = H + o.r;
        if (o.y > H + o.r) o.y = -o.r;
      });

      requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    this.subs.push(new Subscription(() => window.removeEventListener('resize', resize)));

    resize();
    initOrbs();
    draw();
  }

  async ngOnDestroy(): Promise<void> {
    this.subs.forEach((s) => s.unsubscribe());
    this.presenceService.stopHeartbeat();
    await this.signalRService.stop();
  }

  async reclaimSession(): Promise<void> {
    this.authService.claimSession();
    // Reconectar SignalR si se había desconectado
    if (!this.signalRService.connected()) {
      await this.signalRService.start();
      const rooms = this.chatService.rooms();
      await Promise.all(rooms.map(r => this.signalRService.joinRoom(r.id)));
    }
  }

  toggleSettings(): void {
    this.showSettings.update((v) => !v);
    this.mentionService.showPanel.set(false);
  }

  onSettingsClosed(): void {
    this.showSettings.set(false);
  }

  toggleMentionsPanel(): void {
    this.mentionService.togglePanel();
    this.showSettings.set(false);
  }

  onMentionsPanelClosed(): void {
    this.mentionService.showPanel.set(false);
  }
}

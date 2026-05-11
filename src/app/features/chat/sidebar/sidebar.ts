import {  Component, computed, signal, inject, output, OnInit, OnDestroy, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { People } from '../people/people';
import { PresenceDot } from '../../../shared/components/presence-dot/presence-dot';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { PresenceService } from '../../../core/services/presence.service';
import { MentionService } from '../../../core/services/mention.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { SidebarRoom } from '../../../core/models/room.model';
import { PresenceStatus } from '../../../core/models/presence.model';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { MessageSearchResponse } from '../../../core/models/message.model';
import { MessageService } from '../../../core/services/message.service';

import { UsersService, CompanyUser } from '../../../core/services/users.service';
// OverlayScrollDirective removed - using CSS custom-scrollbar
import gsap from 'gsap';

import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [FormsModule, Avatar, RelativeTimePipe, People, PresenceDot, LottieAnimationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Sidebar implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private signalRService = inject(SignalRService);
  private presenceService = inject(PresenceService);
  private mentionService = inject(MentionService);
  private usersService = inject(UsersService);
  private messageService = inject(MessageService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private router = inject(Router);

  readonly allUsers = this.usersService.users;

  // Output event to toggle settings in the parent layout
  readonly settingsRequested = output<void>();

  activeTab = signal<'chats' | 'people'>('chats');
  searchQuery = signal('');

  readonly connected = this.signalRService.connected;
  readonly rooms = this.chatService.rooms;
  readonly activeRoomId = this.chatService.activeRoomId;
  readonly user = this.authService.user;
  
  // Search results
  searchMessagesResults = signal<MessageSearchResponse[]>([]);
  isSearchingMessages = signal(false);
  private searchSubject = new Subject<string>();

  private _typingByRoom = signal<Map<number, string[]>>(new Map());
  private _typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private subs: Subscription[] = [];

  readonly filteredRooms = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const allRooms = this.rooms();
    
    // 1. Filtrar
    let result = query 
      ? allRooms.filter((r) => 
          this.getRoomDisplayName(r).toLowerCase().includes(query) ||
          r.lastMessagePreview?.toLowerCase().includes(query) ||
          (r.participantNames && r.participantNames.some(name => name.toLowerCase().includes(query)))
        )
      : [...allRooms];

    // 2. Ordenar por fecha del último mensaje (Descendente)
    return result.sort((a, b) => {
      const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return dateB - dateA;
    });
  });

  ngOnInit(): void {

    this.subs.push(
      this.signalRService.userTyping$.subscribe(({ roomId, userId, userName, isTyping }) => {
        if (userId === this.authService.user()?.userId) return;

        const key = `${roomId}:${userId}`;

        if (isTyping) {
          // Limpiar timeout anterior si había
          const prev = this._typingTimeouts.get(key);
          if (prev) clearTimeout(prev);

          this._typingByRoom.update(map => {
            const next = new Map(map);
            const current = next.get(roomId) || [];
            if (!current.includes(userName)) next.set(roomId, [...current, userName]);
            return next;
          });

          // Auto-limpiar si no llega la señal de "stop typing" (8s)
          const timeout = setTimeout(() => {
            this._typingByRoom.update(map => {
              const next = new Map(map);
              next.set(roomId, (next.get(roomId) || []).filter(n => n !== userName));
              return next;
            });
            this._typingTimeouts.delete(key);
          }, 8000);
          this._typingTimeouts.set(key, timeout);
        } else {
          const prev = this._typingTimeouts.get(key);
          if (prev) { clearTimeout(prev); this._typingTimeouts.delete(key); }

          this._typingByRoom.update(map => {
            const next = new Map(map);
            next.set(roomId, (next.get(roomId) || []).filter(n => n !== userName));
            return next;
          });
        }
      })
    );

    // Global search logic
    this.subs.push(
      this.searchSubject.pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(query => {
          if (query.trim().length < 3) {
            return of([]);
          }
          this.isSearchingMessages.set(true);
          return this.messageService.globalSearchMessages$(query).pipe(
            catchError(() => of([]))
          );
        })
      ).subscribe(results => {
        this.searchMessagesResults.set(results);
        this.isSearchingMessages.set(false);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this._typingTimeouts.forEach(t => clearTimeout(t));
    this._typingTimeouts.clear();
  }

  getTypingForRoom(roomId: number): string[] {
    return this._typingByRoom().get(roomId) || [];
  }

  getRoomDisplayName(room: SidebarRoom): string {
    if (room.type === 1) {
      return room.directChatPartnerName || 'Chat directo';
    }
    return room.name || 'Grupo sin nombre';
  }

  isOnline(room: SidebarRoom): boolean {
    if (room.type !== 1 || !room.directChatPartnerId) return false;
    return this.signalRService.isUserOnline(String(room.directChatPartnerId));
  }

  getPartnerPresenceStatus(room: SidebarRoom): PresenceStatus {
    if (room.type !== 1 || !room.directChatPartnerId) return 4;
    // Acceder al presenceMap como signal para que OnPush detecte los cambios
    return this.presenceService.presenceMap().get(String(room.directChatPartnerId))?.status ?? 4;
  }

  hasMentions(room: SidebarRoom): boolean {
    return this.mentionService.mentions().some(m => m.chatRoomId === room.id && !m.isRead);
  }

  getMentionCount(room: SidebarRoom): number {
    return this.mentionService.mentions().filter(m => m.chatRoomId === room.id && !m.isRead).length;
  }

  selectRoom(room: SidebarRoom): void {
    this.chatService.setActiveRoom(room.id);
    this.router.navigate(['/chat', room.id]);
  }

  selectMessageResult(result: MessageSearchResponse): void {
    this.chatService.setActiveRoom(result.chatRoomId);
    // Use a query parameter to signal jumping to a message
    this.router.navigate(['/chat', result.chatRoomId], { 
      queryParams: { jumpTo: result.id } 
    });
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.searchSubject.next(val);
  }

  setTab(tab: 'chats' | 'people'): void {
    this.activeTab.set(tab);
  }

  openSettings(): void {
    this.settingsRequested.emit();
  }

  // ── Group Creation ──
  showGroupModal = signal(false);
  groupName = signal('');
  selectedUsersForGroup = signal<string[]>([]);
  searchGroupUsersQuery = signal('');
  creatingGroup = signal(false);

  readonly filteredUsersForGroup = computed(() => {
    const query = this.searchGroupUsersQuery().toLowerCase();
    const all = this.allUsers();
    if (!query) return all;
    return all.filter(u => 
      u.nombreCompleto.toLowerCase().includes(query) ||
      (u.departmentName || '').toLowerCase().includes(query) ||
      (u.warehouseName || '').toLowerCase().includes(query)
    );
  });

  readonly selectedUsersObjects = computed(() => {
    const selectedIds = new Set(this.selectedUsersForGroup());
    return this.allUsers().filter(u => selectedIds.has(u.userId));
  });

  @ViewChild('sidebarContent') sidebarContent!: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    // Apply overlay scrollbars if available
    if (this.sidebarContent) {
      const el = this.sidebarContent.nativeElement;
      // Simple custom scrollbar styling via CSS class
      el.classList.add('custom-scrollbar');
    }
  }

  // We can get all users by leveraging the People component or chatService,
  // but let's assume we can load them or pass them.
  // For simplicity, we just toggle the modal here. The user said "creacion de grupos, revisa se supone nuestra BD lo soporta".

  toggleGroupModal(): void {
    this.showGroupModal.update(v => !v);
    this.groupName.set('');
    this.searchGroupUsersQuery.set('');
    this.selectedUsersForGroup.set([]);
    if (this.showGroupModal() && this.allUsers().length === 0) {
      this.usersService.loadUsers();
    }
    // Animar entrada del sidebar
    if (this.sidebarContent) {
      gsap.fromTo(this.sidebarContent.nativeElement, 
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }

  toggleTab(tab: 'chats' | 'people'): void {
    const prevTab = this.activeTab();
    this.activeTab.set(tab);
    
    // Animar cambio de tab con stagger
    if (this.sidebarContent) {
      const items = this.sidebarContent.nativeElement.querySelectorAll('.sidebar__item');
      if (tab !== prevTab) {
        gsap.fromTo(items, 
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: "back.out(1.2)" }
        );
      }
    }
  }

  toggleUserSelection(userId: string): void {
    if (!userId) return;
    const current = this.selectedUsersForGroup();
    if (current.includes(userId)) {
      this.selectedUsersForGroup.set(current.filter(id => id !== userId));
    } else {
      this.selectedUsersForGroup.set([...current, userId]);
    }
  }

  async createGroup(): Promise<void> {
    if (!this.groupName().trim() || this.selectedUsersForGroup().length === 0) return;
    
    this.creatingGroup.set(true);
    try {
      const room = await this.chatService.createRoom({
        name: this.groupName().trim(),
        type: 2, // Group
        participantIds: this.selectedUsersForGroup()
      });
      this.toggleGroupModal();
      this.chatService.setActiveRoom(room.id);
      this.router.navigate(['/chat', room.id]);
    } catch {
      this.toastService.show('Error', 'No se pudo crear el grupo.', 'error');
    } finally {
      this.creatingGroup.set(false);
    }
  }

  async logout(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Cerrar sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      confirmLabel: 'Cerrar sesión',
      danger: true,
    });
    if (confirmed) this.authService.logout();
  }
}

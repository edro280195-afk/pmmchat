import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, computed, signal, effect, inject, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageService } from '../../../core/services/message.service';
import { ChatService } from '../../../core/services/chat.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { AuthService } from '../../../core/services/auth.service';
import { FileService } from '../../../core/services/file.service';
import { PresenceService } from '../../../core/services/presence.service';
import { MentionService } from '../../../core/services/mention.service';
import { LightboxService } from '../../../core/services/lightbox.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ChatMessage, AttachmentInfo } from '../../../core/models/message.model';
import { SidebarRoom, Participant } from '../../../core/models/room.model';
import { PresenceStatus } from '../../../core/models/presence.model';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

import { AsyncPipe } from '@angular/common';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { SecureMediaPipe } from '../../../shared/pipes/secure-media.pipe';
import { ThemeService } from '../../../core/services/theme.service';
import { ConversationHeaderComponent } from './components/conversation-header/conversation-header';
import { ConversationSidebarComponent } from './components/conversation-sidebar/conversation-sidebar';
import { MessageInputComponent } from './components/message-input/message-input';
import { LinkPreviewService } from '../../../core/services/link-preview.service';
import { MessageList } from './components/message-list/message-list';

import { LottieComponent } from '../../../shared/components/lottie/lottie';
import { LOTTIE_CHECKMARK, LOTTIE_DOUBLE_CHECKMARK, LOTTIE_TYPING } from '../../../shared/animations/lottie-icons';
import gsap from 'gsap';

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [
    FormsModule, 
    ConversationHeaderComponent, ConversationSidebarComponent, 
    MessageInputComponent, MessageList
  ],
  templateUrl: './conversation.html',
  styleUrl: './conversation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Conversation implements OnInit, OnDestroy, AfterViewInit {
  readonly lottieTyping = LOTTIE_TYPING;
  readonly lottieCheck = LOTTIE_CHECKMARK;
  readonly lottieDoubleCheck = LOTTIE_DOUBLE_CHECKMARK;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild(MessageInputComponent) messageInput!: MessageInputComponent;

  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  public chatService = inject(ChatService);
  public signalRService = inject(SignalRService);
  public mentionService = inject(MentionService);
  private authService = inject(AuthService);
  private fileService = inject(FileService);
  private presenceService = inject(PresenceService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  private linkPreviewService = inject(LinkPreviewService);
  public lightbox = inject(LightboxService);

  roomId = 0;
  currentRoom = signal<SidebarRoom | null>(null);
  roomParticipants = signal<Participant[]>([]);

  // Search within chat
  isSearchingChat = signal(false);
  chatSearchQuery = signal('');

  filteredMessages = computed(() => {
    const query = this.chatSearchQuery().toLowerCase();
    const all = this.messages();
    if (!query) return all;
    return all.filter(m => m.content?.toLowerCase().includes(query));
  });

  /** Pre-calcula showSeparator, isSequence y showNewMessages sobre el array FILTRADO */
  readonly displayMessages = computed(() => {
    const msgs = this.filteredMessages();
    const unreadSince = this.unreadSinceAt();
    let newBannerShown = false;

    // Pre-calculamos la fecha ISO (yyyy-MM-dd) y el timestamp de cada mensaje una sola vez.
    // Usar format() de date-fns en lugar de toDateString() da resultados consistentes
    // independientemente del locale del sistema operativo del usuario.
    const dateStrings = msgs.map(m => format(new Date(m.sentAt), 'yyyy-MM-dd'));
    const timestamps = msgs.map(m => new Date(m.sentAt).getTime());

    return msgs.map((msg, i) => {
      const showSeparator = i === 0 || dateStrings[i] !== dateStrings[i - 1];
      const isSequence = this._calcSequenceFromCache(msgs, timestamps, i, showSeparator);

      let showNewMessages = false;
      if (unreadSince && !newBannerShown && msg.sentAt > unreadSince) {
        showNewMessages = true;
        newBannerShown = true;
      }

      return { msg, showSeparator, isSequence, showNewMessages };
    });
  });

  // Room info sidebar
  showRoomSidebar = signal(false);

  // Referencia al sidebar para llamadas explícitas
  @ViewChild(ConversationSidebarComponent) sidebar!: ConversationSidebarComponent;

  // Efecto para cargar archivos cuando se abre el sidebar
  private sidebarLoadEffect = effect(() => {
    const show = this.showRoomSidebar();
    const roomId = this.roomId;
    
    // Solo cargar si el sidebar se acaba de abrir y tenemos un roomId válido
    if (show && roomId > 0 && this.sidebar) {
      // Usar setTimeout para asegurar que el DOM ya se actualizó
      setTimeout(() => {
        this.sidebar?.loadForCurrentRoom();
      }, 0);
    }
  });

  // Group management
  readonly isRoomAdmin = computed(() => this.currentRoom()?.role === 1);
  isRenaming = signal(false);
  renameInput = '';
  isAddingParticipant = signal(false);
  addParticipantQuery = signal('');
  addParticipantResults = signal<Participant[]>([]);
  private addParticipantTimer: ReturnType<typeof setTimeout> | null = null;
  newMessage = '';
  replyingTo = signal<ChatMessage | null>(null);
  editingMessage = signal<ChatMessage | null>(null);
  editContent = '';

  readonly messages = this.messageService.messages;
  readonly loading = this.messageService.loading;
  readonly hasMore = this.messageService.hasMore;
  readonly userId = computed(() => this.authService.user()?.userId ?? '');

  // Typing tracking
  private _typingUsersMap = new Map<string, string>();
  typingUsers = signal<string[]>([]);
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private _typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private isCurrentlyTyping = false;

  // Control de scroll debounce y botón "mensajes nuevos"
  private _scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  showScrollToBottom = signal(false);
  newMessagesCount = signal(0);

  // Emoji picker state
  showEmojiPicker = signal(false);
  showReactionPicker = signal<number | null>(null); // messageId or null
  activeMenuId = signal<number | null>(null);

  // Enterprise features state
  partnerLastReadAt = signal<string | null>(null);

  // Pinned Messages
  pinnedMessages = signal<ChatMessage[]>([]);
  showPinnedPanel = signal(false);
  readonly latestPinned = computed(() => {
    const pinned = this.pinnedMessages();
    return pinned.length > 0 ? pinned[0] : null;
  });

  // Todos los posibles participantes (incluyendo el pendiente si es chat directo nuevo)
  allAvailableParticipants = computed(() => {
    const participants = [...this.roomParticipants()];
    const pending = this.chatService.pendingParticipant();

    if (pending && !participants.some(p => p.userId === pending.userId)) {
      participants.push(pending);
    }

    return participants;
  });

  // Separador de mensajes nuevos (snapshot de lastViewedAt al entrar a la sala)
  unreadSinceAt = signal<string | null>(null);

  // Mensaje mencionado (para hacer scroll y highlight)
  mentionedMessageId = signal<string | null>(null);

  // Efecto para detectar nuevas menciones y hacer highlight
  private mentionEffect = effect(() => {
    const mentions = this.mentionService.mentions();
    const latestMention = mentions.find(m => 
      m.chatRoomId === this.roomId && !m.isRead
    );
    if (latestMention) {
      this.mentionedMessageId.set(latestMention.messageId.toString());
      // Limpiar después de 3 segundos
      setTimeout(() => this.mentionedMessageId.set(null), 3000);
    }
  });

  // Efecto para animar typing indicator con GSAP
  private typingTimeline: gsap.core.Timeline | null = null;
  
  private typingAnimationEffect = effect(() => {
    const isTyping = this.typingUsers().length > 0;
    
    if (isTyping) {
      setTimeout(() => {
        const dots = document.querySelectorAll('.typing-status__indicator span');
        if (dots.length > 0 && !this.typingTimeline) {
          this.typingTimeline = gsap.timeline({repeat: -1});
          this.typingTimeline.to(dots, {
            y: -5,
            duration: 0.4,
            stagger: 0.2,
            yoyo: true,
            ease: "power1.inOut"
          });
        }
      }, 0);
    } else {
      // Limpiar animación cuando dejan de escribir
      if (this.typingTimeline) {
        this.typingTimeline.kill();
        this.typingTimeline = null;
        // Resetear posición de los puntos
        const dots = document.querySelectorAll('.typing-status__indicator span');
        gsap.set(dots, { y: 0 });
      }
    }
  });

  // @Mention autocomplete
  mentionQuery = signal<string | null>(null);
  selectedMentionIndex = signal(0);
  readonly mentionSuggestions = computed(() => {
    const query = this.mentionQuery();
    // Si es null, el dropdown está cerrado. Si es '', mostramos todos.
    if (query === null) return [];

    const lower = query.toLowerCase();
    return this.allAvailableParticipants().filter(p =>
      p.userId !== this.userId() &&
      ((p.claveUsuario?.toLowerCase() ?? '').includes(lower) ||
        (p.nombreCompleto?.toLowerCase() ?? '').includes(lower))
    ).slice(0, 8);
  });

  // File upload constraints — debe coincidir con FileService.MaxFileSizeBytes (50 MB)
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  private readonly ALLOWED_MIME_PREFIXES = [
    'image/', 'audio/', 'video/',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument',
    'application/vnd.ms-excel',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain', 'text/csv',
  ];

  // Voice Notes
  isRecording = signal(false);
  recordingTime = signal(0);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimer: any = null;

  /** U1 — widths for skeleton loader cards (vary for realistic look) */
  readonly skeletonWidths = ['60%', '45%', '70%', '40%', '80%', '55%', '65%', '50%'];

  readonly emojiCategories = [
    { name: 'Frecuentes', icon: '🕐', emojis: ['👍', '❤️', '😂', '🔥', '👏', '🎉', '💯', '✅', '🙏', '😊', '👀', '🤔', '😅', '💪', '🚀'] },
    { name: 'Caras', icon: '😀', emojis: ['😀', '😃', '😄', '😁', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😜', '🤪', '😝', '🤗', '🤩', '😎', '🤓', '🧐', '🤨', '😏', '😒', '🙄', '😬', '😮', '😲', '🥱', '😴', '🤤', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '🥺', '😢', '😭', '😱', '😰', '😥'] },
    { name: 'Gestos', icon: '👋', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🙏', '💪', '🦾'] },
    { name: 'Objetos', icon: '💼', emojis: ['📎', '📁', '📂', '📊', '📈', '📉', '📝', '✏️', '📌', '📍', '🔗', '💡', '🔔', '📢', '📣', '💬', '💭', '🏷️', '📮', '📧', '📨', '📩', '✉️', '📦', '🗂️', '🗃️', '🗄️', '📋', '📄', '📃'] },
    { name: 'Símbolos', icon: '✅', emojis: ['✅', '❌', '⭕', '❗', '❓', '‼️', '⁉️', '💯', '🔥', '✨', '⭐', '🌟', '💫', '⚡', '💥', '🎯', '🏆', '🥇', '🎖️', '🏅', '🎗️', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎'] },
  ];
  activeEmojiCategory = signal(0);

  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.subs.push(
      this.route.params.subscribe(async (params) => {
        const routeUserId = params['userId'] || null;
        this.roomId = params['roomId'] ? +params['roomId'] : 0;

        this.messageService.clearMessages();
        this.replyingTo.set(null);
        this.editingMessage.set(null);
        this.currentRoom.set(null);
        this.chatService.setPendingParticipant(null);
        this.showEmojiPicker.set(false);
        this.showReactionPicker.set(null);
        this.mentionQuery.set(null);
        this.selectedMentionIndex.set(0);
        this.unreadSinceAt.set(null);
        this.partnerLastReadAt.set(null);
        this._typingUsersMap.clear();
        this.typingUsers.set([]);
        this._typingTimeouts.forEach(t => clearTimeout(t));
        this._typingTimeouts.clear();

        if (this.roomId > 0) {
          // 1. Established Room
          this.chatService.setActiveRoom(this.roomId);

          // Capturar lastViewedAt ANTES de cargar mensajes para el separador de nuevos
          const roomMeta = this.chatService.rooms().find(r => r.id === this.roomId);
          this.unreadSinceAt.set(roomMeta?.lastViewedAt ?? null);

          // Cargar participantes y mensajes en PARALELO para reducir el delay
          const [participants] = await Promise.all([
            this.chatService.getParticipants(this.roomId),
            this.messageService.loadMessages(this.roomId),
          ]);
          this.roomParticipants.set(participants);

          // Cargar el LastViewedAt del partner para los checks de lectura
          const partner = participants.find(p => String(p.userId) !== String(this.userId()));
          if (partner?.lastViewedAt) {
            this.partnerLastReadAt.set(partner.lastViewedAt);
          }

          // Fire-and-forget: no bloquean el render inicial
          this.presenceService.loadForRoom(this.roomId);
          this.mentionService.markAsRead(this.roomId);
          this.loadPinnedMessages();

          // Marcar como leído en BD y limpiar contador
          const msgs = this.messageService.messages();
          if (msgs.length > 0) {
            const latestMsgId = msgs[msgs.length - 1].id;
            this.messageService.markAsRead(this.roomId, latestMsgId).catch(console.error);
          }
          this.chatService.updateRoomInSidebar(this.roomId, { unreadCount: 0 });

          // Sincronizar currentRoom con el signal de rooms (sin polling)
          const found = this.chatService.rooms().find(r => r.id === this.roomId);
          if (found) this.currentRoom.set(found);

        } else if (routeUserId) {
          this.chatService.setActiveRoom(null);

          const existing = this.chatService.rooms().find(r =>
            r.type === 1 && r.directChatPartnerId === routeUserId
          );
          if (existing) {
            this.router.navigate(['/chat', existing.id], { replaceUrl: true });
            return;
          }

          try {
            const user = await this.chatService.getUser(routeUserId);
            this.chatService.setPendingParticipant(user);
            this.currentRoom.set({
              id: 0,
              name: user.nombreCompleto,
              type: 1,
              directChatPartnerName: user.nombreCompleto,
              directChatPartnerId: routeUserId,
              unreadCount: 0,
              role: 1
            } as SidebarRoom);
          } catch (err) {
            console.error('Failed to load pending user:', err);
          }
        }

        this.scrollToBottom();
      }),
    );

    this.subs.push(
      this.signalRService.messageReceived$.subscribe(({ roomId, message }) => {
        if (roomId !== this.roomId) return;
        if (message.senderId !== this.userId()) {
          const el = this.messagesContainer?.nativeElement;
          const isAtBottom = el ? (el.scrollHeight - el.scrollTop - el.clientHeight) < 120 : true;
          this.messageService.addMessage(message);
          if (isAtBottom) {
            this.scrollToBottom();
            setTimeout(() => {
              this.messageService.markAsRead(this.roomId, message.id).catch(err => {
                console.error('[markAsRead] Error:', err);
              });
            }, 200);
          } else {
            this.newMessagesCount.update(n => n + 1);
            this.showScrollToBottom.set(true);
          }
        }
      }),
    );

    // Message edited
    this.subs.push(
      this.signalRService.messageEdited$.subscribe(({ messageId, content }) => {
        this.messageService.updateMessage(messageId, content);
      }),
    );

    // Message deleted
    this.subs.push(
      this.signalRService.messageDeleted$.subscribe(({ messageId }) => {
        this.messageService.removeMessage(messageId);
      }),
    );

    // Typing activity
    this.subs.push(
      this.signalRService.userTyping$.subscribe(({ roomId, userId, userName, isTyping }) => {
        if (roomId !== this.roomId || String(userId) === String(this.userId())) return;

        if (isTyping) {
          this._typingUsersMap.set(userId, userName);
          // Safety timeout: auto-limpia después de 8s si nunca llega la señal de "stop typing"
          const existing = this._typingTimeouts.get(userId);
          if (existing) clearTimeout(existing);
          const timeout = setTimeout(() => {
            this._typingUsersMap.delete(userId);
            this.typingUsers.set(Array.from(this._typingUsersMap.values()));
            this._typingTimeouts.delete(userId);
          }, 8000);
          this._typingTimeouts.set(userId, timeout);
        } else {
          this._typingUsersMap.delete(userId);
          const existing = this._typingTimeouts.get(userId);
          if (existing) {
            clearTimeout(existing);
            this._typingTimeouts.delete(userId);
          }
        }
        this.typingUsers.set(Array.from(this._typingUsersMap.values()));
      }),
    );

    // Reactions
    this.subs.push(
      this.signalRService.reactionAdded$.subscribe(({ messageId, userId, userName, emoji }) => {
        this.messageService.updateMessageReactions(messageId, 'add', { userId, userName, emoji });
      }),
    );

    this.subs.push(
      this.signalRService.reactionRemoved$.subscribe(({ messageId, userId, emoji }) => {
        this.messageService.updateMessageReactions(messageId, 'remove', { userId, emoji });
      }),
    );

    // Attachments
    this.subs.push(
      this.signalRService.attachmentAdded$.subscribe(({ messageId, attachment }) => {
        this.messageService.addAttachmentToMessage(messageId, attachment);
      }),
    );

    // Read Receipts
    this.subs.push(
      this.signalRService.roomRead$.subscribe(({ roomId, userId, readAt }) => {
        if (roomId === this.roomId && String(userId) !== String(this.userId())) {
          this.partnerLastReadAt.set(readAt);
        }
      }),
    );

    // Message Pinned
    this.subs.push(
      this.signalRService.messagePinned$.subscribe(({ roomId, messageId, isPinned }) => {
        if (roomId !== this.roomId) return;
        
        // Update message in list
        this.messageService.updateMessagePinned(messageId, isPinned);
        
        // Refresh pinned list
        this.loadPinnedMessages();
      })
    );

    this.subs.push(
      this.signalRService.messageUnpinned$.subscribe(({ roomId, messageId }) => {
        if (roomId !== this.roomId) return;
        
        // Update message in list
        this.messageService.updateMessagePinned(messageId, false);
        
        // Refresh pinned list
        this.loadPinnedMessages();
      })
    );
  }

  ngAfterViewInit(): void {
    // Esconder elementos para la animación inicial de entrada
    gsap.set('app-conversation-header', { opacity: 0, y: -20 });
    gsap.set('app-message-input', { opacity: 0, y: 20 });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.to('app-conversation-header', { opacity: 1, y: 0, duration: 0.5 }, 0.1)
      .to('app-message-input', { opacity: 1, y: 0, duration: 0.5 }, 0.2);
  }

  // ── Presencia del partner ──
  getPartnerPresenceStatus(): PresenceStatus {
    const room = this.currentRoom();
    if (!room || room.type !== 1 || !room.directChatPartnerId) return 4;
    // Leer del signal para que OnPush detecte cambios cuando llega la presencia por SignalR
    return this.presenceService.presenceMap().get(String(room.directChatPartnerId))?.status ?? 4;
  }

  // ── @Menciones — autocomplete ──

  onType(): void {
    // Permitir menciones incluso si roomId es 0 (chats pendientes)

    if (!this.isCurrentlyTyping) {
      this.isCurrentlyTyping = true;
      this.signalRService.sendTyping(this.roomId, true);
    }

    // Reset the "stop typing" timer
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.isCurrentlyTyping = false;
      this.signalRService.sendTyping(this.roomId, false);
    }, 3000);

    // Detectar @mención en curso
    this.detectMentionTrigger();
  }

  private detectMentionTrigger(): void {
    const textarea = this.messageInput?.messageTextarea?.nativeElement;
    if (!textarea) return;

    const cursor = textarea.selectionStart ?? 0;
    const textBefore = this.newMessage.slice(0, cursor);

    const lastAt = textBefore.lastIndexOf('@');
    if (lastAt === -1) { this.mentionQuery.set(null); return; }

    const charBeforeAt = lastAt > 0 ? textBefore[lastAt - 1] : '';
    if (charBeforeAt !== '' && charBeforeAt !== ' ' && charBeforeAt !== '\n') {
      this.mentionQuery.set(null);
      return;
    }

    const fragment = textBefore.slice(lastAt + 1);
    if (fragment.includes(' ')) { this.mentionQuery.set(null); return; }

    this.mentionQuery.set(fragment);
    this.selectedMentionIndex.set(0);
  }

  insertMention(participant: Participant): void {
    const textarea = this.messageInput?.messageTextarea?.nativeElement;
    if (!textarea) return;

    const cursor = textarea.selectionStart ?? 0;
    const textBefore = this.newMessage.slice(0, cursor);
    const atIndex = textBefore.lastIndexOf('@');
    if (atIndex === -1) return;

    const before = this.newMessage.slice(0, atIndex);
    const after = this.newMessage.slice(cursor);
    const mention = `@${participant.claveUsuario} `;

    this.newMessage = before + mention + after;
    this.mentionQuery.set(null);

    setTimeout(() => {
      const newPos = atIndex + mention.length;
      textarea.setSelectionRange(newPos, newPos);
      textarea.focus();
    });
  }

  closeMentionDropdown(): void {
    this.mentionQuery.set(null);
  }

  /** Convierte el contenido del mensaje a HTML resaltando @menciones */

  // ── Presence ──
  isPartnerOnline(): boolean {
    const room = this.currentRoom();
    if (!room || room.type !== 1 || !room.directChatPartnerId) return false;
    return this.signalRService.isUserOnline(String(room.directChatPartnerId));
  }

  async toggleReaction(message: ChatMessage, emoji: string): Promise<void> {
    const existing = message.reactions?.find(r => r.emoji === emoji && r.userId === this.userId());
    if (existing) {
      await this.messageService.removeReaction(this.roomId, message.id, emoji);
    } else {
      await this.messageService.addReaction(this.roomId, message.id, emoji);
    }
  }

  getGroupedReactions(message: ChatMessage) {
    if (!message.reactions) return [];
    const groups = message.reactions.reduce((acc, curr) => {
      if (!acc[curr.emoji]) acc[curr.emoji] = [];
      acc[curr.emoji].push(curr);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(groups).map(([emoji, users]) => ({
      emoji,
      count: users.length,
      users: users.map(u => u.userName).join(', '),
      reactedByMe: users.some(u => u.userId === this.userId())
    }));
  }
  isMediaOnly(msg: ChatMessage): boolean {
    if (!msg.attachments || msg.attachments.length === 0) return false;
    return !msg.content || msg.content.trim() === '';
  }

  getFirstUrl(msg: ChatMessage): string | null {
    if (msg.isDeleted || this.isMediaOnly(msg)) return null;
    return this.linkPreviewService.extractFirstUrl(msg.content);
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    if (this.isCurrentlyTyping && this.roomId > 0) {
      this.signalRService.sendTyping(this.roomId, false);
    }
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    if (this._scrollDebounceTimer) clearTimeout(this._scrollDebounceTimer);
    this._typingTimeouts.forEach(t => clearTimeout(t));
    this._typingTimeouts.clear();
    if (this.isRecording()) {
      this.cancelRecording();
    } else {
      clearInterval(this.recordingTimer);
    }
  }

  private _calcDateSeparator(msgs: ChatMessage[], index: number): boolean {
    if (index === 0) return true;
    return !isSameDay(new Date(msgs[index].sentAt), new Date(msgs[index - 1].sentAt));
  }

  private _calcSequence(msgs: ChatMessage[], index: number, showSeparator: boolean): boolean {
    if (index === 0) return false;
    if (showSeparator) return false;
    const current = msgs[index];
    const previous = msgs[index - 1];
    if (current.senderId !== previous.senderId) return false;
    const currTime = new Date(current.sentAt).getTime();
    const prevTime = new Date(previous.sentAt).getTime();
    return (currTime - prevTime) < 5 * 60 * 1000;
  }

  // Versión optimizada para displayMessages: recibe arrays pre-calculados
  private _calcSequenceFromCache(
    msgs: ChatMessage[],
    timestamps: number[],
    index: number,
    showSeparator: boolean
  ): boolean {
    if (index === 0 || showSeparator) return false;
    if (msgs[index].senderId !== msgs[index - 1].senderId) return false;
    return (timestamps[index] - timestamps[index - 1]) < 5 * 60 * 1000;
  }

  isSequenceMessage(index: number): boolean {
    const msgs = this.messages();
    const showSep = this._calcDateSeparator(msgs, index);
    return this._calcSequence(msgs, index, showSep);
  }

  shouldShowDateSeparator(index: number): boolean {
    return this._calcDateSeparator(this.messages(), index);
  }

  getDateSeparator(dateStr: string): string {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoy';
    if (isYesterday(date)) return 'Ayer';
    // "28 de abril", "3 de enero"
    return format(date, "d 'de' MMMM", { locale: es });
  }

  getRoomDisplayName(): string {
    const room = this.currentRoom();
    const pending = this.chatService.pendingParticipant();

    if (!room) {
      return pending?.nombreCompleto ?? 'Cargando...';
    }

    if (room.type === 1) {
      return room.directChatPartnerName || pending?.nombreCompleto || 'Chat directo';
    }

    return room.name || 'Grupo';
  }

  private stopTyping(): void {
    if (this.isCurrentlyTyping && this.roomId > 0) {
      this.isCurrentlyTyping = false;
      this.signalRService.sendTyping(this.roomId, false);
    }
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  private syncCurrentRoom(): void {
    const rooms = this.chatService.rooms();
    const found = rooms.find((r) => r.id === this.roomId);
    if (found) {
      this.currentRoom.set(found);
    }
  }

  async sendMessage(event?: { content: string, files: File[] }): Promise<void> {
    const content = event ? event.content.trim() : this.newMessage.trim();
    const files = event ? event.files : [];
    
    if (!content && files.length === 0) return;

    this.stopTyping();

    // Si es un chat pendiente, crear la sala primero
    if (this.roomId === 0) {
      const pending = this.chatService.pendingParticipant();
      if (pending) {
        try {
          const room = await this.chatService.createRoom({
            type: 1,
            participantIds: [pending.userId]
          });
          this.roomId = room.id;
          this.chatService.setActiveRoom(this.roomId);
          this.chatService.setPendingParticipant(null);
          this.currentRoom.set(room);
          await this.router.navigate(['/chat', room.id], { replaceUrl: true });
        } catch (err: any) {
          // Sala ya existe — redirigir y continuar enviando
          if (err?.status === 409 && err?.error?.roomId) {
            this.roomId = +err.error.roomId;
            this.chatService.setActiveRoom(this.roomId);
            this.chatService.setPendingParticipant(null);
            await this.router.navigate(['/chat', this.roomId], { replaceUrl: true });
          } else {
            this.toastService.show('Error', 'No se pudo crear la sala.', 'error');
            return;
          }
        }
      }
    }

    const replyTo = this.replyingTo();
    this.newMessage = '';
    this.replyingTo.set(null);

    // If we have files, upload them
    if (files.length > 0) {
      await this.uploadFiles(files, content, replyTo);
      return;
    }

    const tempId = crypto.randomUUID();
    const tempMsg: ChatMessage = {
      id: 0,
      tempId,
      senderId: this.userId(),
      senderName: this.authService.user()?.nombreCompleto ?? '',
      content,
      sentAt: new Date().toISOString(),
      editedAt: null,
      replyToMessageId: replyTo?.id ?? null,
      isDeleted: false,
      isPinned: false,
      pinnedAt: null,
      pinnedByUserId: null,
      attachments: [],
      reactions: [],
      status: 'sending',
    };
    this.messageService.addTempMessage(tempMsg);
    this.chatService.moveRoomToTop(this.roomId);
    this.scrollToBottom();

    try {
      const message = await this.messageService.sendMessage(this.roomId, {
        content,
        replyToMessageId: replyTo?.id ?? null,
      });
      this.messageService.replaceTempMessage(tempId, { ...message, status: 'sent' });

      this.chatService.updateRoomInSidebar(this.roomId, {
        lastMessagePreview: message.content,
        lastSenderName: message.senderName,
        lastMessageAt: message.sentAt,
        unreadCount: 0,
      });
    } catch (err) {
      this.messageService.markMessageFailed(tempId);
      this.newMessage = content;
      this.toastService.show('Error al enviar', 'No se pudo enviar el mensaje. Usa el botón reintentar.', 'error');
    }
  }

  async retryMessage(msg: ChatMessage): Promise<void> {
    if (!msg.tempId || !msg.content) return;
    this.messageService.markMessageRetrying(msg.tempId);

    try {
      const sent = await this.messageService.sendMessage(this.roomId, {
        content: msg.content,
        replyToMessageId: msg.replyToMessageId ?? null,
      });
      this.messageService.replaceTempMessage(msg.tempId, { ...sent, status: 'sent' });
    } catch {
      this.messageService.markMessageFailed(msg.tempId);
      this.toastService.show('Error al enviar', 'Sigue sin poder enviarse. Revisa tu conexión.', 'error');
    }
  }

  toggleMenu(id: number, event?: any): void {
    if (event) event.stopPropagation();
    if (this.activeMenuId() === id) {
      this.activeMenuId.set(null);
    } else {
      this.activeMenuId.set(id);
    }
  }

  replyTo(message: ChatMessage): void {
    this.replyingTo.set(message);
    this.editingMessage.set(null);
  }

  cancelReply(): void {
    this.replyingTo.set(null);
  }

  startEdit(message: ChatMessage): void {
    this.editingMessage.set(message);
    this.editContent = message.content || '';
    this.replyingTo.set(null);
  }

  async confirmEdit(): Promise<void> {
    const msg = this.editingMessage();
    if (!msg || !this.editContent.trim()) return;

    await this.messageService.editMessage(msg.id, { content: this.editContent.trim() });
    this.messageService.updateMessage(msg.id, this.editContent.trim());
    this.editingMessage.set(null);
    this.editContent = '';
  }

  cancelEdit(): void {
    this.editingMessage.set(null);
    this.editContent = '';
  }

  async deleteMessage(message: ChatMessage): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Eliminar mensaje',
      message: '¿Estás seguro de que deseas eliminar este mensaje para todos?',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.messageService.deleteMessage(message.id);
      this.messageService.removeMessage(message.id);
    } catch {
      this.toastService.show('Error', 'No se pudo eliminar el mensaje.', 'error');
    }
  }

  async deleteChat(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Eliminar conversación',
      message: '¿Estás seguro de que deseas eliminar este chat? Se ocultará permanentemente de tu lista de chats activos. No volverá a aparecer aunque recibas nuevos mensajes, manteniendo tu bandeja limpia y respetando tu decisión.',
      confirmLabel: 'Eliminar permanentemente',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.chatService.deleteRoom(this.roomId);
      this.toastService.show('Chat eliminado', 'La conversación se ha ocultado.', 'success');
      this.router.navigate(['/chat']);
    } catch {
      this.toastService.show('Error', 'No se pudo eliminar el chat.', 'error');
    }
  }

  async loadOlder(): Promise<void> {
    const msgs = this.messages();
    if (msgs.length === 0 || !this.hasMore()) return;
    await this.messageService.loadMessages(this.roomId, msgs[0].sentAt);
  }

  onScroll(): void {
    // Debounce: evita múltiples cargas si el usuario hace scroll rápido
    if (this._scrollDebounceTimer) clearTimeout(this._scrollDebounceTimer);
    this._scrollDebounceTimer = setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (!el) return;

      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

      // Ocultar el botón "ir al fondo" si ya está abajo
      if (distFromBottom < 120) {
        this.showScrollToBottom.set(false);
        this.newMessagesCount.set(0);
      }

      // Cargar historial al llegar arriba
      if (el.scrollTop < 100 && !this.loading() && this.hasMore()) {
        this.loadOlder();
      }
    }, 80);
  }

  scrollToBottomAndRead(): void {
    this.showScrollToBottom.set(false);
    this.newMessagesCount.set(0);
    this.scrollToBottom();
    const msgs = this.messageService.messages();
    if (msgs.length > 0) {
      this.messageService.markAsRead(this.roomId, msgs[msgs.length - 1].id).catch(console.error);
    }
  }

  isOwnMessage(message: ChatMessage): boolean {
    return message.senderId === this.userId();
  }

  downloadAttachment(attachmentId: number, fileName?: string): void {
    this.fileService.downloadFile(attachmentId, fileName);
  }

  getFileUrl(attachmentId: number): string {
    return this.fileService.getDownloadUrl(attachmentId);
  }

  onKeyDown(event: KeyboardEvent): void {
    const suggestions = this.mentionSuggestions();

    // Navegación del dropdown de @menciones con teclado
    if (suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedMentionIndex.update(i => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedMentionIndex.update(i => Math.max(i - 1, 0));
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.insertMention(suggestions[this.selectedMentionIndex()]);
        this.selectedMentionIndex.set(0);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.mentionQuery.set(null);
        this.selectedMentionIndex.set(0);
        return;
      }
    }
  }

  async onPaste(event: ClipboardEvent): Promise<void> {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          const ext = item.type.split('/')[1] || 'png';
          const file = new File([blob], `clipboard_${Date.now()}.${ext}`, { type: item.type });
          await this.uploadFiles([file]);
        }
        return;
      }
    }
  }

  // ── File Attachment ──

  // ── Emoji Picker ──
  toggleEmojiPicker(): void {
    this.showEmojiPicker.update(v => !v);
    this.showReactionPicker.set(null);
  }

  selectEmoji(emoji: string): void {
    this.newMessage += emoji;
    this.showEmojiPicker.set(false);
  }

  setEmojiCategory(index: number): void {
    this.activeEmojiCategory.set(index);
  }

  // ── Reaction Picker ──
  toggleReactionPicker(messageId: number): void {
    this.showReactionPicker.update(v => v === messageId ? null : messageId);
    this.showEmojiPicker.set(false);
  }

  async selectReaction(message: ChatMessage, emoji: string): Promise<void> {
    this.showReactionPicker.set(null);
    await this.toggleReaction(message, emoji);
  }

  // Close pickers on outside click
  closePickers(): void {
    this.showEmojiPicker.set(false);
    this.showReactionPicker.set(null);
  }

  getRepliedMessage(replyId: number): ChatMessage | undefined {
    return this.messages().find((m) => m.id === replyId);
  }

  scrollToMessage(messageId: number): void {
    // We could find the element by ID and scroll to it if we added IDs to the DOM
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-pulse');
      setTimeout(() => el.classList.remove('highlight-pulse'), 2000);
    }
  }

  // ── Drag & Drop ──
  dragging = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave(): void {
    this.dragging.set(false);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.messageInput.addFiles(Array.from(files));
    }
  }

  private validateFile(file: File): string | null {
    if (file.size > this.MAX_FILE_SIZE) {
      return `"${file.name}" excede el límite de 20 MB`;
    }

    const fileName = file.name.toLowerCase();
    const isMedia = file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/');

    if (!isMedia) {
      const allowedExtensions = ['.pdf', '.xls', '.xlsx', '.csv', '.txt', '.docx', '.zip'];
      const hasAllowedExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

      if (!hasAllowedExtension) {
        return `Tipo de archivo no permitido. Solo se admiten: pdf, xls, docx, zip, csv, txt`;
      }
    }

    const allowed = this.ALLOWED_MIME_PREFIXES.some(p => file.type.startsWith(p));
    if (!allowed) {
      return `Formato de archivo no permitido: ${file.type || 'desconocido'}`;
    }
    return null;
  }

  async uploadFiles(files: File[], customMessage?: string, replyToMessage?: ChatMessage | null): Promise<void> {
    // Validar todos los archivos antes de subir alguno
    for (const file of files) {
      const error = this.validateFile(file);
      if (error) {
        this.toastService.show('Archivo no válido', error, 'warning');
        return;
      }
    }

    // Si no hay mensaje personalizado, usamos un espacio de ancho cero para evitar rechazos del backend por contenido vacío
    const baseContent = customMessage?.trim() || '\u200B';
    const replyTo = replyToMessage || this.replyingTo(); 
    let isFirst = true;

    for (const file of files) {
      try {
        // Solo el primer archivo lleva el contenido y el reply context
        const msgContent = isFirst ? baseContent : '';
        const message = await this.messageService.sendMessage(this.roomId, {
          content: msgContent,
          replyToMessageId: isFirst ? (replyTo?.id ?? null) : null,
        });

        if (isFirst) {
          this.replyingTo.set(null);
          isFirst = false;
        }

        this.messageService.addMessage(message);
        this.chatService.moveRoomToTop(this.roomId);
        this.chatService.updateRoomInSidebar(this.roomId, {
          lastMessagePreview: message.content || 'Archivo adjunto',
          lastSenderName: message.senderName,
          lastMessageAt: message.sentAt,
          unreadCount: 0,
        });
        this.scrollToBottom();

        await this.fileService.uploadFile(this.roomId, message.id, file);
      } catch (err) {
        console.error('Failed to upload file:', err);
        this.toastService.show('Error de envío', `No se pudo enviar el archivo ${file.name}`, 'error');
      }
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  // ── Lightbox ──
  openImage(attId: number): void {
    // Recopilar todas las imágenes de los mensajes actuales
    let allImages: AttachmentInfo[] = [];
    
    this.messageService.messages().forEach(m => {
      if (m.attachments) {
        allImages.push(...m.attachments.filter(a => a.mimeType?.startsWith('image/')));
      }
    });

    // Si el sidebar está cargado, añadir sus imágenes (evitando duplicados)
    if (this.sidebar) {
      const sidebarImages = this.sidebar.attachments().filter(a => a.mimeType?.startsWith('image/'));
      const existingIds = new Set(allImages.map(img => img.id));
      sidebarImages.forEach(img => {
        if (!existingIds.has(img.id)) {
          allImages.push(img);
        }
      });
    }

    // Ordenar por ID para mantener consistencia cronológica (suponiendo IDs autoincrementales)
    allImages.sort((a, b) => a.id - b.id);

    const startIndex = allImages.findIndex(img => img.id === attId);
    this.lightbox.open(allImages, startIndex >= 0 ? startIndex : 0);
  }

  closeImage(): void {
    this.lightbox.close();
  }
   // ── Voice Notes ──
  async toggleRecording(): Promise<void> {
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  private async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const file = new File([audioBlob], 'Voice_Note.webm', { type: 'audio/webm' });

        // Stop mic tracks
        stream.getTracks().forEach(track => track.stop());

        await this.uploadFiles([file]);
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
      this.recordingTime.set(0);
      this.recordingTimer = setInterval(() => this.recordingTime.update(t => t + 1), 1000);
    } catch {
      this.toastService.show('Micrófono', 'No se pudo acceder al micrófono. Verifica los permisos.', 'error');
    }
  }

  private stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      clearInterval(this.recordingTimer);
    }
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = null; // Prevent upload
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
      this.isRecording.set(false);
      clearInterval(this.recordingTimer);
      this.audioChunks = [];
    }
  }

  /**
   * Workaround para audio webm grabado con MediaRecorder en Chrome.
   * El formato webm no incrusta la duración en los headers del contenedor,
   * así que el navegador muestra 0:00 / 0:00. Al buscar Infinity el navegador
   * escanea el archivo completo y recalcula la duración real.
   */
  fixAudioDuration(event: Event): void {
    const audio = event.target as HTMLAudioElement;
    if (audio.duration === Infinity) {
      audio.currentTime = 1e101;
      const onTimeUpdate = () => {
        audio.currentTime = 0;
        audio.removeEventListener('timeupdate', onTimeUpdate);
      };
      audio.addEventListener('timeupdate', onTimeUpdate);
    }
  }

  onAudioCanPlay(event: Event): void {
    // console.log('Audio can play');
  }

  onAudioError(event: Event, att: any): void {
    console.error('Error al cargar audio:', att.fileName, event);
    // Intentar recargar si es necesario o mostrar aviso
  }

  get formattedRecordingTime(): string {
    const mins = Math.floor(this.recordingTime() / 60);
    const secs = this.recordingTime() % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // ── Gestión de Grupo ──

  startRename(): void {
    this.renameInput = this.currentRoom()?.name ?? '';
    this.isRenaming.set(true);
  }

  async confirmRename(): Promise<void> {
    const name = this.renameInput.trim();
    if (!name || !this.roomId) return;
    try {
      await this.chatService.renameRoom(this.roomId, name);
      this.chatService.updateRoomInSidebar(this.roomId, { name });
      this.currentRoom.update(r => r ? { ...r, name } : r);
    } catch (err) {
      console.error('Error al renombrar el grupo:', err);
    }
    this.isRenaming.set(false);
  }

  cancelRename(): void {
    this.isRenaming.set(false);
  }

  async removeParticipant(userId: string): Promise<void> {
    const participant = this.roomParticipants().find(p => p.userId === userId);
    const confirmed = await this.confirmService.confirm({
      title: 'Eliminar participante',
      message: `¿Estás seguro de que deseas eliminar a ${participant?.nombreCompleto || 'este usuario'} del grupo?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });

    if (!confirmed) return;

    try {
      await this.chatService.removeParticipant(this.roomId, userId);
      this.roomParticipants.update(ps => ps.filter(p => p.userId !== userId));
      this.toastService.show('Participante eliminado', 'El usuario ha sido retirado del grupo.', 'success');
    } catch (err) {
      console.error('Error al eliminar participante:', err);
      this.toastService.show('Error', 'No se pudo eliminar al participante.', 'error');
    }
  }

  onAddParticipantSearch(query: string): void {
    this.addParticipantQuery.set(query);
    if (this.addParticipantTimer) clearTimeout(this.addParticipantTimer);
    if (!query.trim()) {
      this.addParticipantResults.set([]);
      return;
    }
    this.addParticipantTimer = setTimeout(async () => {
      try {
        const results = await this.chatService.searchUsers(query);
        // Filtrar los que ya están en el grupo
        const current = new Set(this.roomParticipants().map(p => p.userId));
        this.addParticipantResults.set(results.filter(r => !current.has(r.userId)));
      } catch (err) {
        console.error('Error al buscar usuarios:', err);
      }
    }, 300);
  }

  async addParticipant(participant: Participant): Promise<void> {
    try {
      await this.chatService.addParticipant(this.roomId, participant.userId);
      this.roomParticipants.update(ps => [...ps, participant]);
      this.addParticipantQuery.set('');
      this.addParticipantResults.set([]);
      this.isAddingParticipant.set(false);
    } catch (err) {
      console.error('Error al agregar participante:', err);
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: any): void {
    // 1. Cerrar elementos emergentes o estados activos en orden de prioridad
    if (this.lightbox.isOpen()) {
      this.lightbox.close();
      return;
    }
    if (this.showEmojiPicker()) {
      this.showEmojiPicker.set(false);
      return;
    }
    if (this.showReactionPicker()) {
      this.showReactionPicker.set(null);
      return;
    }
    if (this.activeMenuId()) {
      this.activeMenuId.set(null);
      return;
    }
    if (this.mentionQuery() !== null) {
      this.mentionQuery.set(null);
      return;
    }
    if (this.isSearchingChat()) {
      this.toggleSearch();
      return;
    }
    if (this.showRoomSidebar()) {
      this.showRoomSidebar.set(false);
      return;
    }
    if (this.replyingTo()) {
      this.cancelReply();
      return;
    }
    if (this.editingMessage()) {
      this.cancelEdit();
      return;
    }

    // 2. Si no hay nada abierto, cerramos la conversación
    this.closeChat();
  }

  closeChat(): void {
    this.chatService.setActiveRoom(null);
    this.router.navigate(['/chat']);
  }

  toggleSearch(): void {
    this.isSearchingChat.update(v => !v);
    if (!this.isSearchingChat()) {
      this.chatSearchQuery.set('');
    }
  }

  toggleRoomSidebar(): void {
    this.showRoomSidebar.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.message__dots-btn') && !target.closest('.message__quick-actions')) {
      this.activeMenuId.set(null);
    }
  }

  async loadPinnedMessages(): Promise<void> {
    if (this.roomId === 0) return;
    try {
      const pinned = await this.messageService.getPinnedMessages(this.roomId);
      this.pinnedMessages.set(pinned);
    } catch (err) {
      console.error('Error loading pinned messages:', err);
    }
  }

  async pinMessage(message: ChatMessage): Promise<void> {
    try {
      await this.messageService.pinMessage(this.roomId, message.id);
      this.activeMenuId.set(null);
    } catch (err) {
      this.toastService.show('Error', 'No se pudo anclar el mensaje.', 'error');
    }
  }

  async unpinMessage(message: ChatMessage): Promise<void> {
    try {
      await this.messageService.unpinMessage(this.roomId, message.id);
      this.activeMenuId.set(null);
    } catch (err) {
      this.toastService.show('Error', 'No se pudo desanclar el mensaje.', 'error');
    }
  }

  scrollToPinnedMessage(messageId: number): void {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-pulse');
      setTimeout(() => el.classList.remove('highlight-pulse'), 2000);
    } else {
      this.toastService.show('Info', 'El mensaje está muy atrás en el historial.', 'info');
    }
  }
}

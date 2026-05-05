import {
  Component, ChangeDetectionStrategy, input, output, computed,
  ViewChild, ElementRef, AfterViewInit, effect
} from '@angular/core';
// OverlayScrollDirective removed - using CSS class instead
import { AsyncPipe } from '@angular/common';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChatMessage } from '../../../../../core/models/message.model';
import { Participant } from '../../../../../core/models/room.model';
import { Avatar } from '../../../../../shared/components/avatar/avatar';
import { FileSizePipe } from '../../../../../shared/pipes/file-size.pipe';
import { SecureMediaPipe } from '../../../../../shared/pipes/secure-media.pipe';
import { RenderContentPipe } from '../../../../../shared/pipes/render-content.pipe';
import { AudioPlayerComponent } from '../../../../../shared/components/audio-player/audio-player';
import { LOTTIE_CHECKMARK, LOTTIE_DOUBLE_CHECKMARK } from '../../../../../shared/animations/lottie-icons';
import { LinkPreviewComponent } from '../link-preview/link-preview';
import { LottieAnimationComponent } from '../../../../../shared/components/lottie-animation/lottie-animation';
import { LongPressDirective } from '../../../../../shared/directives/long-press.directive';
import { UtcDatePipe } from '../../../../../shared/pipes/utc-date.pipe';
import { ReactionAnimDirective } from '../../../../../shared/directives/reaction-anim.directive';
import { MessageFlightDirective } from '../../../../../shared/directives/message-flight.directive';
import { LinkPreviewService } from '../../../../../core/services/link-preview.service';
import { FloatingUiService } from '../../../../../core/services/floating-ui.service';
import gsap from 'gsap';

export interface DisplayMessage {
  msg: ChatMessage;
  showSeparator: boolean;
  isSequence: boolean;
  showNewMessages: boolean;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  users: string;
  reactedByMe: boolean;
}

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [
    AsyncPipe, ScrollingModule,
    Avatar, FileSizePipe, SecureMediaPipe, RenderContentPipe,
    AudioPlayerComponent, LinkPreviewComponent, LongPressDirective,
    UtcDatePipe, ReactionAnimDirective, MessageFlightDirective,
    LottieAnimationComponent
  ],
  templateUrl: './message-list.html',
  styleUrl: './message-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageList implements AfterViewInit {

  // ── Inputs ──
  displayMessages = input.required<DisplayMessage[]>();
  userId = input.required<string>();
  loading = input<boolean>(false);
  hasMore = input<boolean>(true);
  skeletonWidths = input<string[]>([]);
  editingMessageId = input<number | null>(null);
  editContent = input<string>('');
  activeMenuId = input<number | null>(null);
  showReactionPickerId = input<number | null>(null);
  partnerLastReadAt = input<string | null>(null);
  isPartnerOnline = input<boolean>(false);
  quickReactionEmojis = input<string[]>([]);
  chatWallpaper = input<string>('');
  alwaysShowTime = input<boolean>(false);
  mentionedMessageId = input<string | null>(null);

  // ── Lottie Icons ──
  readonly LOTTIE_CHECKMARK = LOTTIE_CHECKMARK;
  readonly LOTTIE_DOUBLE_CHECKMARK = LOTTIE_DOUBLE_CHECKMARK;

  // ── Outputs ──
  loadOlder = output<void>();
  scrolled = output<void>();
  openImage = output<number>();
  downloadAttachment = output<{ id: number; fileName: string }>();
  replyTo = output<ChatMessage>();
  startEdit = output<ChatMessage>();
  confirmEdit = output<void>();
  cancelEdit = output<void>();
  editContentChange = output<string>();
  deleteMessage = output<ChatMessage>();
  toggleMenu = output<{ id: number; event?: MouseEvent }>();
  toggleReactionPicker = output<number>();
  selectReaction = output<{ message: ChatMessage; emoji: string }>();
  toggleReaction = output<{ message: ChatMessage; emoji: string }>();
  pinMessage = output<ChatMessage>();
  unpinMessage = output<ChatMessage>();
  retryMessage = output<ChatMessage>();
  scrollToMessage = output<number>();

  @ViewChild('messageContainer') messageContainer!: ElementRef<HTMLElement>;
  @ViewChild('reactionTrigger') reactionTrigger!: ElementRef<HTMLElement>;
  @ViewChild('reactionPicker') reactionPicker!: ElementRef<HTMLElement>;

  constructor(
    private linkPreviewService: LinkPreviewService,
    private floatingUi: FloatingUiService
  ) {
    // Efecto para posicionar reaction picker con Floating UI
    effect(() => {
      const pickerId = this.showReactionPickerId();
      if (pickerId && this.reactionTrigger && this.reactionPicker) {
        setTimeout(() => {
          this.floatingUi.positionElement(
            this.reactionTrigger.nativeElement,
            this.reactionPicker.nativeElement,
            { placement: 'top-start', offset: 4 }
          );
        });
      } else if (this.reactionPicker) {
        this.floatingUi.cleanup(this.reactionPicker.nativeElement);
      }
    });

    // Efecto para highlight de mención
    effect(() => {
      const mentionedId = this.mentionedMessageId();
      if (mentionedId) {
        setTimeout(() => {
          const el = document.getElementById(`msg-${mentionedId}`);
          if (el) {
            this.highlightMention(el);
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    });
  }

  ngAfterViewInit(): void {
    // Apply custom scrollbar class
    if (this.messageContainer) {
      this.messageContainer.nativeElement.classList.add('custom-scrollbar');
    }

    // Observar cambios en los mensajes para animar nuevos
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.classList.contains('message')) {
            this.animateMessageEntry(node);
          }
        });
      });
    });

    if (this.messageContainer) {
      observer.observe(this.messageContainer.nativeElement, { childList: true });
    }
  }

  animateMessageEntry(element: HTMLElement): void {
    gsap.fromTo(element,
      { scale: 0.8, opacity: 0, rotation: -2 },
      {
        scale: 1,
        opacity: 1,
        rotation: 0,
        duration: 0.4,
        ease: "back.out(1.2)"
      }
    );
  }

  animateReactionExplosion(event: MouseEvent, emoji: string): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    const explosion = document.createElement('div');
    explosion.innerText = emoji;
    explosion.style.position = 'fixed';
    explosion.style.left = `${rect.left + rect.width / 2}px`;
    explosion.style.top = `${rect.top + rect.height / 2}px`;
    explosion.style.fontSize = '24px';
    explosion.style.zIndex = '9999';
    explosion.style.pointerEvents = 'none';
    document.body.appendChild(explosion);

    gsap.fromTo(explosion,
      { scale: 0, opacity: 1 },
      {
        scale: 1.5,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        onComplete: () => explosion.remove()
      }
    );
  }

  onBubbleMouseMove(event: MouseEvent, bubble: HTMLElement): void {
    const rect = bubble.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;

    gsap.to(bubble, {
      x: x * 0.05,
      y: y * 0.05,
      rotation: x * 0.01,
      duration: 0.3,
      ease: "power2.out",
      overwrite: true
    });
  }

  onBubbleMouseLeave(bubble: HTMLElement): void {
    gsap.to(bubble, {
      x: 0,
      y: 0,
      rotation: 0,
      duration: 0.5,
      ease: "elastic.out(1, 0.3)",
      overwrite: true
    });
  }

  onReactionPillClick(event: MouseEvent, message: ChatMessage, emoji: string): void {
    event.stopPropagation();
    const pill = event.currentTarget as HTMLElement;

    gsap.fromTo(pill,
      { scale: 0.8 },
      {
        scale: 1,
        duration: 0.5,
        ease: "elastic.out(1, 0.4)"
      }
    );

    this.toggleReaction.emit({ message, emoji });
  }

  highlightMention(messageElement: HTMLElement): void {
    gsap.fromTo(messageElement,
      { backgroundColor: "rgba(255, 235, 59, 0.3)" },
      {
        backgroundColor: "transparent",
        duration: 1.5,
        ease: "power2.out"
      }
    );
  }

  isOwnMessage(msg: ChatMessage): boolean {
    return String(msg.senderId) === String(this.userId());
  }

  isMediaOnly(msg: ChatMessage): boolean {
    if (!msg.attachments || msg.attachments.length === 0) return false;
    return !msg.content || msg.content.trim() === '';
  }

  getFirstUrl(msg: ChatMessage): string | null {
    if (msg.isDeleted || this.isMediaOnly(msg)) return null;
    return this.linkPreviewService.extractFirstUrl(msg.content);
  }

  getGroupedReactions(msg: ChatMessage): ReactionGroup[] {
    if (!msg.reactions) return [];
    const groups = msg.reactions.reduce((acc, curr) => {
      if (!acc[curr.emoji]) acc[curr.emoji] = [];
      acc[curr.emoji].push(curr);
      return acc;
    }, {} as Record<string, any[]>);
    return Object.entries(groups).map(([emoji, users]) => ({
      emoji,
      count: users.length,
      users: users.map((u: any) => u.userName).join(', '),
      reactedByMe: users.some((u: any) => u.userId === this.userId()),
    }));
  }

  getRepliedMessage(replyId: number): ChatMessage | undefined {
    return this.displayMessages().find(d => d.msg.id === replyId)?.msg;
  }

  getDateSeparator(sentAt: string): string {
    const date = new Date(sentAt);
    if (isToday(date)) return 'Hoy';
    if (isYesterday(date)) return 'Ayer';
    return format(date, "d 'de' MMMM", { locale: es });
  }

  onEditContentChange(event: Event): void {
    this.editContentChange.emit((event.target as HTMLTextAreaElement).value);
  }

  isMessageRead(msg: ChatMessage): boolean {
    const lastRead = this.partnerLastReadAt();
    if (!lastRead || !msg.sentAt) return false;

    try {
      // Normalizar fechas para asegurar que ambas sean tratadas como UTC si no tienen 'Z'
      const normalize = (d: string) => (d.includes('T') || d.includes(' ')) ? (d.endsWith('Z') ? d : d.replace(' ', 'T') + 'Z') : d;
      
      const sentDate = new Date(normalize(msg.sentAt));
      const readDate = new Date(normalize(lastRead));
      
      return sentDate.getTime() <= readDate.getTime();
    } catch (e) {
      return false;
    }
  }
}

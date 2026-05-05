import { Component, ChangeDetectionStrategy, input, output, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Avatar } from '../../../../../shared/components/avatar/avatar';
import { SidebarRoom, Participant } from '../../../../../core/models/room.model';
import { MessageService } from '../../../../../core/services/message.service';
import { FileService } from '../../../../../core/services/file.service';
import { AttachmentInfo } from '../../../../../core/models/message.model';
import { SecureMediaPipe } from '../../../../../shared/pipes/secure-media.pipe';
import { FileSizePipe } from '../../../../../shared/pipes/file-size.pipe';

@Component({
  selector: 'app-conversation-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, Avatar, SecureMediaPipe, FileSizePipe],
  templateUrl: './conversation-sidebar.html',
  styleUrl: './conversation-sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConversationSidebarComponent {
  private messageService = inject(MessageService);
  private fileService = inject(FileService);

  roomDisplayName = input.required<string>();
  currentRoom = input<SidebarRoom | null>(null);
  isRoomAdmin = input<boolean>(false);
  roomParticipants = input<Participant[]>([]);
  isAddingParticipant = input<boolean>(false);
  addParticipantQuery = input<string>('');
  addParticipantResults = input<Participant[]>([]);
  isRenaming = input<boolean>(false);
  renameInput = input<string>('');
  userId = input<string>('');

  // Shared Files Logic
  activeTab = signal<'media' | 'docs'>('media');
  attachments = signal<AttachmentInfo[]>([]);
  loadingAttachments = signal(false);
  hasMoreAttachments = signal(true);
  private lastAttachmentId = 0;
  private loadedKey: string | null = null;

  constructor() {
    // Efecto que recarga cuando cambia la sala o el tab activo
    effect(() => {
      const room = this.currentRoom();
      const tab = this.activeTab();
      if (room?.id) {
        this.loadForCurrentRoom();
      }
    });
  }

  loadForCurrentRoom(): void {
    const room = this.currentRoom();
    if (!room?.id) return;

    const key = `${room.id}-${this.activeTab()}`;
    if (key === this.loadedKey) return;

    this.loadedKey = key;
    this.attachments.set([]);
    this.lastAttachmentId = 0;
    this.hasMoreAttachments.set(true);
    this.loadAttachments(room.id);
  }

  setTab(tab: 'media' | 'docs'): void {
    this.activeTab.set(tab);
    // El efecto se encarga de recargar
  }

  async loadAttachments(roomId: number): Promise<void> {
    if (this.loadingAttachments() || !this.hasMoreAttachments()) return;

    this.loadingAttachments.set(true);
    try {
      const type = this.activeTab() === 'media' ? 'image' : 'document';
      const results = await this.messageService.getAttachments(roomId, type, this.lastAttachmentId || undefined);
      
      if (results.length > 0) {
        this.attachments.update((curr: AttachmentInfo[]) => [...curr, ...results]);
        this.lastAttachmentId = results[results.length - 1].id;
      }
      this.hasMoreAttachments.set(results.length === 24);
    } catch (err) {
      console.error('Error loading attachments:', err);
    } finally {
      this.loadingAttachments.set(false);
    }
  }

  downloadFile(att: AttachmentInfo): void {
    this.fileService.downloadFile(att.id, att.fileName);
  }

  openLightbox = output<number>();

  toggleRoomSidebar = output<void>();
  startRename = output<void>();
  confirmRename = output<void>();
  cancelRename = output<void>();
  renameInputChange = output<string>();
  isAddingParticipantChange = output<boolean>();
  onAddParticipantSearch = output<string>();
  addParticipant = output<Participant>();
  removeParticipant = output<string>();
  deleteChat = output<void>();
}

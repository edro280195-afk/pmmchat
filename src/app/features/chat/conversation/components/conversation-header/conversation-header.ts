import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Avatar } from '../../../../../shared/components/avatar/avatar';
import { PresenceDot } from '../../../../../shared/components/presence-dot/presence-dot';
import { SidebarRoom, Participant } from '../../../../../core/models/room.model';
import { PresenceStatus } from '../../../../../core/models/presence.model';

@Component({
  selector: 'app-conversation-header',
  standalone: true,
  imports: [CommonModule, FormsModule, Avatar, PresenceDot],
  templateUrl: './conversation-header.html',
  styleUrl: './conversation-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConversationHeaderComponent {
  roomDisplayName = input.required<string>();
  currentRoom = input<SidebarRoom | null>(null);
  partnerPresenceStatus = input<PresenceStatus>(4);
  roomParticipants = input<Participant[]>([]);
  isPartnerOnline = input<boolean>(false);
  isSearchingChat = input<boolean>(false);
  chatSearchQuery = input<string>('');
  showMentionsPanel = input<boolean>(false);
  mentionCount = input<number>(0);

  searchQueryChange = output<string>();
  toggleSearch = output<void>();
  toggleRoomSidebar = output<void>();
  closeChat = output<void>();
  toggleMentionsPanel = output<void>();
}

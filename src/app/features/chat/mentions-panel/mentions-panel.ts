import {  Component, inject, output , ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MentionService } from '../../../core/services/mention.service';

@Component({
  selector: 'app-mentions-panel',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './mentions-panel.html',
  styleUrl: './mentions-panel.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MentionsPanel {
  private mentionService = inject(MentionService);
  private router = inject(Router);

  readonly closed = output<void>();
  readonly mentions = this.mentionService.mentions;

  close(): void {
    this.closed.emit();
  }

  async navigateToMention(chatRoomId: number): Promise<void> {
    await this.mentionService.markAsRead(chatRoomId);
    this.router.navigate(['/chat', chatRoomId]);
    this.close();
  }
}

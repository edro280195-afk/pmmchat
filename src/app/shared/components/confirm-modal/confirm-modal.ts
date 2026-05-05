import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmModalComponent {
  readonly confirmService = inject(ConfirmService);
}

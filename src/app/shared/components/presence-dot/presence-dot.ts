import { Component, computed, input } from '@angular/core';
import { PresenceStatus, PRESENCE_COLORS, PRESENCE_LABELS } from '../../../core/models/presence.model';

@Component({
  selector: 'app-presence-dot',
  standalone: true,
  template: `
    <span
      class="presence-dot"
      [style.background-color]="color()"
      [title]="label()"
      [attr.data-status]="status()"
    ></span>
  `,
  styles: [`
    .presence-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid var(--app-bg-surface, #fff);
      flex-shrink: 0;
      transition: background-color 0.3s ease;
    }
  `]
})
export class PresenceDot {
  status = input<PresenceStatus>(4);

  color = computed(() => PRESENCE_COLORS[this.status()]);
  label = computed(() => PRESENCE_LABELS[this.status()]);
}

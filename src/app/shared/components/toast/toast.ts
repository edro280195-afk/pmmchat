import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="toast" 
          [class]="'toast--' + toast.type"
          (click)="handleToastClick(toast)"
        >
          <div class="toast__icon">
            @switch (toast.type) {
              @case ('success') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              }
              @case ('error') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              }
              @default {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              }
            }
          </div>
          <div class="toast__content">
            <div class="toast__title">{{ toast.title }}</div>
            <div class="toast__message">{{ toast.message }}</div>
          </div>
          <button class="toast__close" (click)="$event.stopPropagation(); toastService.remove(toast.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          @if (toast.progress !== undefined) {
            <div class="toast__progress-bg" style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(0,0,0,0.1); border-radius: 0 0 12px 12px; overflow: hidden;">
              <div class="toast__progress-bar" [style.width.%]="toast.progress" style="height: 100%; background: currentColor; transition: width 0.3s ease;"></div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./toast.scss']
})
export class ToastComponent {
  readonly toastService = inject(ToastService);

  handleToastClick(toast: any) {
    if (toast.onClick) {
      toast.onClick();
      this.toastService.remove(toast.id);
    }
  }
}

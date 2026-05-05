import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  onClick?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private counter = 0;

  show(title: string, message: string, type: Toast['type'] = 'info', onClick?: () => void) {
    const id = this.counter++;
    const newToast: Toast = { id, title, message, type, onClick };
    
    this.toasts.update(current => [...current, newToast]);

    // Auto-remove after 6 seconds
    setTimeout(() => this.remove(id), 6000);
  }

  remove(id: number) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}

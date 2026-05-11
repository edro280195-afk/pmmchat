import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  onClick?: () => void;
  progress?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private counter = 0;

  show(title: string, message: string, type: Toast['type'] = 'info', onClick?: () => void, initialProgress?: number): number {
    const id = this.counter++;
    const newToast: Toast = { id, title, message, type, onClick, progress: initialProgress };
    
    this.toasts.update(current => [...current, newToast]);

    // Solo auto-remover si no tiene progreso o si llega a 100
    if (initialProgress === undefined) {
      setTimeout(() => this.remove(id), 6000);
    }
    
    return id;
  }

  updateProgress(id: number, progress: number, newMessage?: string) {
    this.toasts.update(current => current.map(t => {
      if (t.id === id) {
        return { ...t, progress, message: newMessage || t.message };
      }
      return t;
    }));

    if (progress >= 100) {
      setTimeout(() => this.remove(id), 3000); // remover poco después de completarse
    }
  }

  remove(id: number) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}

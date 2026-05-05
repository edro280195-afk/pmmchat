import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  confirm(options: ConfirmOptions | string): Promise<boolean> {
    const resolved: ConfirmOptions =
      typeof options === 'string' ? { message: options } : options;

    return new Promise(resolve => {
      this.pending.set({ options: resolved, resolve });
    });
  }

  respond(value: boolean): void {
    const p = this.pending();
    if (!p) return;
    this.pending.set(null);
    p.resolve(value);
  }
}

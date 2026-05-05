import {  Component , ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-titlebar',
  standalone: true,
  template: `
    <div class="titlebar" data-tauri-drag-region>
      <div class="titlebar__brand">
        <svg class="titlebar__logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="titlebar__title">PMMChat</span>
      </div>
      <div class="titlebar__controls">
        <button class="titlebar__btn titlebar__btn--minimize" (click)="minimize()" title="Minimizar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/>
          </svg>
        </button>
        <button class="titlebar__btn titlebar__btn--maximize" (click)="maximize()" title="Maximizar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
          </svg>
        </button>
        <button class="titlebar__btn titlebar__btn--close" (click)="close()" title="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styleUrl: './titlebar.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Titlebar {
  readonly isTauri = !!(window as any).__TAURI__;

  minimize(): void {
    if (this.isTauri) {
      (window as any).__TAURI__?.window?.getCurrentWindow()?.minimize?.();
    }
  }

  maximize(): void {
    if (this.isTauri) {
      (window as any).__TAURI__?.window?.getCurrentWindow()?.toggleMaximize?.();
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  close(): void {
    if (this.isTauri) {
      (window as any).__TAURI__?.window?.getCurrentWindow()?.close?.();
    }
  }
}

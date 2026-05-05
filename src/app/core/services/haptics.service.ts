import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HapticsService {
  private available = false;

  constructor() {
    // Check if we're in a Tauri environment
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      this.available = true;
    }
  }

  async trigger(type: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
    if (!this.available) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('plugin:haptics|trigger', {
        intensity: type === 'light' ? 0.3 : type === 'medium' ? 0.6 : 1.0
      });
    } catch {
      // Fallback: use navigator.vibrate if available (mobile web)
      if (navigator.vibrate) {
        const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 30;
        navigator.vibrate(duration);
      }
    }
  }
}

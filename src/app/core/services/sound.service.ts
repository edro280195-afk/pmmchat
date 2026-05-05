import { Injectable, signal } from '@angular/core';

export type SoundType = 'message_sent' | 'message_received' | 'notification' | 'error' | 'mention';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private audioContext: AudioContext | null = null;
  private enabled = signal<boolean>(true);

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  play(type: SoundType): void {
    if (!this.enabled()) return;

    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Configure sound based on type
    switch (type) {
      case 'message_sent':
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
        break;

      case 'message_received':
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
        break;

      case 'notification':
        oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;

      case 'error':
        oscillator.frequency.setValueAtTime(300, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;

      case 'mention':
        oscillator.frequency.setValueAtTime(900, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;
    }
  }

  toggle(): void {
    this.enabled.update(v => !v);
  }

  isEnabled(): boolean {
    return this.enabled();
  }

  setEnabled(value: boolean): void {
    this.enabled.set(value);
  }
}

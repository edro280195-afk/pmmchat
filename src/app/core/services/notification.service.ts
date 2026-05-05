import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { SoundService } from './sound.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private toastService = inject(ToastService);
  private soundService = inject(SoundService);
  private permissionGranted = false;

  async init(): Promise<void> {
    await this.requestPermission();
  }

  async requestPermission(): Promise<boolean> {
    // Standard Web Notification API
    if (!('Notification' in window)) return false;
    
    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    }
    
    return false;
  }

  async notify(title: string, body: string, onClick?: () => void, soundType: 'notification' | 'mention' = 'notification'): Promise<void> {
    // 1. Play sound
    this.soundService.play(soundType);

    // 2. In-App Toast (Always works and looks premium)
    this.toastService.show(title, body, 'info', onClick);

    // 3. Standard Web Notification API (as fallback for when app is minimized)
    if (this.permissionGranted) {
      // Only show desktop if window is not focused OR if a callback is provided
      if (!document.hasFocus() || onClick) {
        try {
          const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            silent: true, // We handle sound ourselves
          });

          if (onClick) {
            notification.onclick = () => {
              window.focus();
              onClick();
              notification.close();
            };
          }
          setTimeout(() => notification.close(), 5000);
        } catch (e) {
          console.warn('Desktop notification failed', e);
        }
      }
    }
  }
}

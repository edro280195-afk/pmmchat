import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { SoundService } from './sound.service';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private toastService = inject(ToastService);
  private soundService = inject(SoundService);
  private tauriPermissionGranted = false;
  private callbacks = new Map<number, () => void>();
  private nextId = 1;

  async init(): Promise<void> {
    try {
      this.tauriPermissionGranted = await isPermissionGranted();

      if (!this.tauriPermissionGranted) {
        const permission = await requestPermission();
        this.tauriPermissionGranted = permission === 'granted';
      }

      console.log('[NotificationService] Permisos:', this.tauriPermissionGranted);
    } catch (e) {
      console.warn('[NotificationService] No se pudo inicializar el plugin:', e);
    }
  }

  async notify(
    title: string,
    body: string,
    onClick?: () => void,
    soundType: 'notification' | 'mention' = 'notification',
    forceNative = false
  ): Promise<void> {
    const id = this.nextId++;
    if (onClick) {
      this.callbacks.set(id, onClick);
      setTimeout(() => this.callbacks.delete(id), 60000);
    }

    this.soundService.play(soundType);
    this.toastService.show(title, body, 'info', onClick);

    const isWindowVisible = await getCurrentWindow().isVisible();

    if (!isWindowVisible) {
      try {
        await invoke('request_window_attention');
      } catch (e) {
        console.warn('[NotificationService] request_window_attention falló:', e);
      }
    }

    if (this.tauriPermissionGranted && (!isWindowVisible || forceNative)) {
      try {
        await sendNotification({
          id,
          title,
          body,
          silent: true
        });
        console.log('[NotificationService] Notificación enviada:', { id, title });
      } catch (e) {
        console.error('[NotificationService] Error:', e);
      }
    }
  }
}
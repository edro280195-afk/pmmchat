import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { SoundService } from './sound.service';
import { isPermissionGranted, requestPermission, sendNotification, onAction } from '@tauri-apps/plugin-notification';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private toastService = inject(ToastService);
  private soundService = inject(SoundService);
  private tauriPermissionGranted = false;
  
  // Guardamos los callbacks por ID de notificación (numérico)
  private callbacks = new Map<number, () => void>();
  private nextId = 1;

  async init(): Promise<void> {
    try {
      // Usamos el nombre exacto exportado por el plugin: onAction
      await onAction((event: any) => {
        console.log('[NotificationService] Acción detectada:', event);
        
        // Traer ventana al frente
        const win = getCurrentWindow();
        win.show().then(() => win.setFocus());

        // El ID en Tauri v2 suele venir dentro de event.notification o event
        const id = event.notification?.id || event.id;
        if (id) {
          const callback = this.callbacks.get(Number(id));
          if (callback) {
            callback();
            this.callbacks.delete(Number(id));
          }
        }
      });

      this.tauriPermissionGranted = await isPermissionGranted();
      if (!this.tauriPermissionGranted) {
        const permission = await requestPermission();
        this.tauriPermissionGranted = permission === 'granted';
      }
    } catch (e) {
      console.warn('Tauri Notification plugin not available', e);
    }
  }

  async notify(title: string, body: string, onClick?: () => void, soundType: 'notification' | 'mention' = 'notification', forceNative = false): Promise<void> {
    // Generar ID numérico (Tauri espera un entero de 32 bits)
    const id = this.nextId++;
    if (this.nextId > 2147483647) this.nextId = 1; // Reiniciar si llega al límite de 32 bits

    if (onClick) {
      this.callbacks.set(id, onClick);
      setTimeout(() => this.callbacks.delete(id), 60000);
    }

    this.soundService.play(soundType);
    this.toastService.show(title, body, 'info', onClick);

    const isWindowFocused = await getCurrentWindow().isFocused();
    if (!isWindowFocused) {
      try {
        await invoke('request_window_attention');
      } catch (e) {
        console.warn('Failed to request window attention', e);
      }
    }

    console.log(`[NotificationService] Detección de foco: focused=${isWindowFocused}, permissions=${this.tauriPermissionGranted}`);

    if (this.tauriPermissionGranted && (!isWindowFocused || forceNative)) {
      try {
        console.log('[NotificationService] Enviando notificación nativa...');
        sendNotification({ 
          id,
          title, 
          body, 
          icon: 'assets/logochatpmm.png',
          silent: true // Evita el doble sonido (Windows se calla, nosotros sonamos)
        });
      } catch (e) {
        console.error('[NotificationService] Error al enviar notificación nativa:', e);
      }
    }
  }
}

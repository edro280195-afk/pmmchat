import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { SoundService } from './sound.service';
import { isPermissionGranted, requestPermission, sendNotification, onAction, registerActionTypes } from '@tauri-apps/plugin-notification';
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
      // Intentar registrar acciones (puede fallar en algunas plataformas o versiones si el comando no existe)
      await registerActionTypes([
        {
          id: 'open-chat',
          actions: [
            {
              id: 'open',
              title: 'Abrir chat'
            }
          ]
        }
      ]).catch(e => console.warn('[NotificationService] registerActionTypes no soportado:', e));

      await onAction((event: any) => {
        console.log('[NotificationService] Acción detectada:', event);
        
        const win = getCurrentWindow();
        win.show().then(() => win.setFocus());

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

    const win = getCurrentWindow();
    const isWindowFocused = await win.isFocused();

    if (!isWindowFocused) {
      try {
        // Tauri 2.0: 1 = Critical (flash until focus), 2 = Informational (flash once)
        await win.requestUserAttention(1);
      } catch (e) {
        // Fallback to invoke if API differs or for backward compatibility with custom commands
        try {
          await invoke('request_window_attention');
        } catch (innerE) {
          console.warn('[NotificationService] No se pudo solicitar atención del usuario:', innerE);
        }
      }
    }

    if (this.tauriPermissionGranted && (!isWindowFocused || forceNative)) {
      try {
        await sendNotification({
          id,
          title,
          body,
          actionTypeId: 'open-chat',
          silent: true
        });
        console.log('[NotificationService] Notificación enviada:', { id, title });
      } catch (e) {
        console.error('[NotificationService] Error:', e);
      }
    }
  }
}
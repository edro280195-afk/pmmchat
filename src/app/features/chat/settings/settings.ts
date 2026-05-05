import {  Component, inject, output , ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Settings {
  readonly themeService = inject(ThemeService);
  private notificationService = inject(NotificationService);
  readonly closed = output<void>();

  close(): void {
    this.closed.emit();
  }


  onGlassChange(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.themeService.setGlassIntensity(Number(val));
  }

  onWallpaperFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        this.themeService.setCustomWallpaper(base64);
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  async testNotification() {
    try {
      await this.notificationService.notify(
        'PMMChat',
        '¡Funciona! Esta es una notificación de prueba.',
        () => { console.log('Test notification clicked'); },
        'notification',
        true
      );
    } catch (e) {
      alert('Error al lanzar la notificación. Revisa los permisos del navegador o la configuración de Tauri.');
    }
  }
}

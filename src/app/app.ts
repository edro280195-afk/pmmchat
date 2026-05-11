import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Titlebar } from './shared/components/titlebar/titlebar';
import { ThemeService } from './core/services/theme.service';
import { UpdateService } from './core/services/update.service';
import { NotificationService } from './core/services/notification.service';
import { getCurrentWindow } from '@tauri-apps/api/window';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Titlebar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  private themeService = inject(ThemeService);
  private updateService = inject(UpdateService);
  private notificationService = inject(NotificationService);

  constructor() {
    this.notificationService.init();
    
    // Prevenir el menú contextual por defecto para evitar congelamiento de Tauri
    document.addEventListener('contextmenu', event => {
      event.preventDefault();
    });
  }
}

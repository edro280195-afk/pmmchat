import {  Component , ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Titlebar } from './shared/components/titlebar/titlebar';
import { ThemeService } from './core/services/theme.service';
import { UpdateService } from './core/services/update.service';

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
}

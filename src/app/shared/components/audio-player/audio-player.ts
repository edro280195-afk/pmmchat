import {
  Component, ElementRef, ViewChild, inject, ChangeDetectionStrategy, signal, computed, PLATFORM_ID, input, effect,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';
import WaveSurfer from 'wavesurfer.js';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="audio-player" [class.audio-player--playing]="isPlaying()">
      <button class="play-btn" (click)="togglePlay()" [disabled]="loading() || error()">
        @if (isPlaying()) {
          <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        } @else {
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        }
      </button>

      <div class="player-body">
        <div class="waveform-container" #waveformContainer></div>

        <div class="player-info">
          <span class="time">{{ formatTime(currentTime()) }}</span>
          <span class="duration">{{ formatTime(duration()) }}</span>
          <span class="loading-label" *ngIf="loading()">Cargando...</span>
          <span class="error-label" *ngIf="error()">Error</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; max-width: 320px; }

    .audio-player {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: var(--app-bg-surface);
      border: 1px solid var(--app-border);
      border-radius: 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: var(--shadow-sm);

      &--playing {
        border-color: var(--app-primary);
        box-shadow: 0 4px 20px rgba(var(--primary-rgb), 0.15);
      }
    }

    .play-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--app-primary);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s ease;
      box-shadow: 0 4px 10px rgba(var(--primary-rgb), 0.3);

      svg { width: 20px; height: 20px; }
      &:hover:not(:disabled) { transform: scale(1.08); filter: brightness(1.1); }
      &:active:not(:disabled) { transform: scale(0.95); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .player-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .waveform-container {
      width: 100%;
      height: 40px;
      cursor: pointer;

      /* WaveSurfer genera un canvas, lo ajustamos */
      ::ng-deep wave {
        overflow: hidden !important;
        border-radius: 8px;
      }

      ::ng-deep wave wave {
        background: transparent !important;
      }
    }

    .player-info {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-weight: 700;
      color: var(--app-muted-fg);
      font-variant-numeric: tabular-nums;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .loading-label { color: var(--app-primary); animation: pulse 1.5s infinite; }
    .error-label { color: var(--app-danger); }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class AudioPlayerComponent {
  attachmentId = input.required<number>();
  mimeType = input<string>('audio/webm');

  @ViewChild('waveformContainer') waveformEl!: ElementRef<HTMLDivElement>;

  private wavesurfer?: WaveSurfer;
  private blobUrl: string | null = null;
  private isBrowser: boolean;

  loading = signal(true);
  error = signal(false);
  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  progressPercent = computed(() => {
    const d = this.duration();
    return d > 0 ? (this.currentTime() / d) * 100 : 0;
  });

  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Usar effect para reaccionar a cambios en los inputs (signal inputs)
    let initialized = false;
    effect(() => {
      const id = this.attachmentId();
      if (id && this.isBrowser) {
        if (!initialized) {
          initialized = true;
          this.loadAudio();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.wavesurfer?.destroy();
    this.revokeBlobUrl();
  }

  private loadAudio(): void {
    // Evitar múltiples cargas simultáneas
    if (this.loading() && this.wavesurfer) return;

    this.loading.set(true);
    this.error.set(false);

    const url = `${environment.apiUrl}/files/${this.attachmentId()}`;

    // Usar responseType: 'blob' para manejo más directo
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.revokeBlobUrl();
        this.blobUrl = URL.createObjectURL(blob);
        this.loading.set(false);

        // Pequeño delay para asegurar que el DOM esté listo
        setTimeout(() => this.initWaveSurfer(), 50);
      },
      error: (err) => {
        console.error('AudioPlayer: error al cargar audio', err);
        this.loading.set(false);
        this.error.set(true);
      }
    });
  }

  private initWaveSurfer(): void {
    if (!this.waveformEl || !this.blobUrl || !this.isBrowser) return;

    // Destruir instancia anterior si existe
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
      this.wavesurfer = undefined;
    }

    const isDark = this.checkDarkTheme();

    try {
      this.wavesurfer = WaveSurfer.create({
        container: this.waveformEl.nativeElement,
        url: this.blobUrl,
        waveColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
        progressColor: getComputedStyle(document.documentElement)
          .getPropertyValue('--app-primary').trim() || '#3b82f6',
        cursorColor: 'transparent',
        barWidth: 3,
        barRadius: 3,
        barGap: 2,
        height: 40,
        normalize: true,
      });

      this.wavesurfer.on('ready', () => {
        this.duration.set(this.wavesurfer!.getDuration());
        this.error.set(false);
      });

      this.wavesurfer.on('timeupdate', (currentTime: number) => {
        this.currentTime.set(currentTime);
      });

      this.wavesurfer.on('play', () => {
        this.isPlaying.set(true);
      });

      this.wavesurfer.on('pause', () => {
        this.isPlaying.set(false);
      });

      this.wavesurfer.on('finish', () => {
        this.isPlaying.set(false);
        this.currentTime.set(0);
      });

      this.wavesurfer.on('error', (err: any) => {
        console.error('AudioPlayer: error en WaveSurfer', err);
        this.error.set(true);
        this.loading.set(false);
      });
    } catch (e) {
      console.error('AudioPlayer: error al inicializar WaveSurfer', e);
      this.error.set(true);
      this.loading.set(false);
    }
  }

  togglePlay(): void {
    if (!this.wavesurfer || this.error()) return;
    try {
      this.wavesurfer.playPause();
    } catch (e) {
      console.error('AudioPlayer: error al reproducir', e);
      this.error.set(true);
    }
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private revokeBlobUrl(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }

  private checkDarkTheme(): boolean {
    if (!this.isBrowser) return false;

    const appBg = getComputedStyle(document.documentElement)
      .getPropertyValue('--app-bg').trim();

    return appBg.includes('0') ||
      document.documentElement.classList.contains('theme-aura') ||
      document.documentElement.classList.contains('theme-dark') ||
      document.documentElement.classList.contains('theme-amber') ||
       document.documentElement.classList.contains('theme-cosmos') ||
       document.documentElement.classList.contains('theme-midnight-gold');
   }
}

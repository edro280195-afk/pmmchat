import { Injectable, signal, effect } from '@angular/core';

export interface ThemeOption {
  id: string;
  name: string;
  icon: string;
  previewColors: { bg: string; primary: string; accent: string };
}

export type FontFamily = 'font-outfit' | 'font-lora' | 'font-space' | 'font-imperial' | 'font-unkempt';
export type FontSize = 'size-xsmall' | 'size-small' | 'size-medium' | 'size-large' | 'size-xlarge';
export type MessageDensity = 'density-compact' | 'density-normal' | 'density-spacious';

export interface SoundOption {
  id: string;
  name: string;
  file: string;
}


@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly currentTheme = signal(this.load('pmmchat-theme', 'theme-aura'));
  readonly currentFont = signal<FontFamily>(this.load('pmmchat-font', 'font-outfit') as FontFamily);
  readonly currentSize = signal<FontSize>(this.load('pmmchat-size', 'size-medium') as FontSize);
  readonly currentDensity = signal<MessageDensity>(this.load('pmmchat-density', 'density-normal') as MessageDensity);
  readonly soundEnabled = signal(this.load('pmmchat-sound', 'true') === 'true');
  readonly notificationsEnabled = signal(this.load('pmmchat-notif', 'true') === 'true');
  readonly currentNotificationSound = signal(this.load('pmmchat-notif-sound', 'bell1.mp3'));

  
  // Personalization
  readonly accentColor = signal(this.load('pmmchat-accent', ''));
  readonly glassIntensity = signal(Number(this.load('pmmchat-glass', '24'))); // 24 = default CSS
  readonly chatWallpaper = signal(this.load('pmmchat-wallpaper', ''));
  readonly customWallpaperUrl = signal(this.load('pmmchat-custom-wp', ''));

  // Behavior settings
  readonly enterToSend = signal(this.load('pmmchat-enter-send', 'true') === 'true');
  readonly alwaysShowTime = signal(this.load('pmmchat-always-time', 'false') === 'true');

  readonly themes: ThemeOption[] = [
    {
      id: 'theme-serenity',
      name: 'Serenity',
      icon: 'M12 3v22M5 8l7 7 7-7',
      previewColors: { bg: '#f8fafc', primary: '#3b82f6', accent: '#60a5fa' },
    },
    {
      id: 'theme-pmm',
      name: 'PMM Corporate',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      previewColors: { bg: '#f5f7fa', primary: '#003d8c', accent: '#BECC00' },
    },
    {
      id: 'theme-dark',
      name: 'Elite Dark',
      icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
      previewColors: { bg: '#02040a', primary: '#8b5cf6', accent: '#38bdf8' },
    },
    {
      id: 'theme-emerald',
      name: 'Emerald',
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14',
      previewColors: { bg: '#f0fdf4', primary: '#10b981', accent: '#34d399' },
    },
    {
      id: 'theme-amber',
      name: 'Amber',
      icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
      previewColors: { bg: '#0d0801', primary: '#fbbf24', accent: '#f59e0b' },
    },
    {
      id: 'theme-coquette',
      name: 'Blossom',
      icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
      previewColors: { bg: '#fff5f7', primary: '#ec4899', accent: '#fbcfe8' },
    },
    {
      id: 'theme-aura',
      name: 'Aura',
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      previewColors: { bg: '#03050c', primary: '#818cf8', accent: '#c084fc' },
    },
    {
      id: 'theme-cosmos',
      name: 'Cosmos',
      icon: 'M12 2.25l4.5 4.5m0 0l-4.5 4.5m4.5-4.5H3',
      previewColors: { bg: '#020617', primary: '#2dd4bf', accent: '#38bdf8' },
    },
    {
      id: 'theme-midnight-gold',
      name: 'Midnight Gold',
      icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
      previewColors: { bg: '#11151E', primary: '#CBAF87', accent: '#56788B' },
    },
  ];

  readonly fontOptions = [
    { id: 'font-outfit' as const, name: 'Outfit', preview: 'Aa' },
    { id: 'font-lora' as const, name: 'Lora', preview: 'Aa' },
    { id: 'font-space' as const, name: 'Space Grotesk', preview: 'Aa' },
    { id: 'font-imperial' as const, name: 'Imperial Script', preview: 'Aa' },
    { id: 'font-unkempt' as const, name: 'Unkempt', preview: 'Aa' },
  ];

  readonly sizeOptions = [
    { id: 'size-xsmall' as const, name: 'X-Small' },
    { id: 'size-small' as const, name: 'Small' },
    { id: 'size-medium' as const, name: 'Medium' },
    { id: 'size-large' as const, name: 'Large' },
    { id: 'size-xlarge' as const, name: 'X-Large' },
  ];

  readonly densityOptions = [
    { id: 'density-compact' as const, name: 'Compacto' },
    { id: 'density-normal' as const, name: 'Normal' },
    { id: 'density-spacious' as const, name: 'Espacioso' },
  ];

  readonly soundOptions: SoundOption[] = [
    { id: 'bell1', name: 'Bell 1', file: 'bell1.mp3' },
    { id: 'bell2', name: 'Bell 2', file: 'bell2.mp3' },
    { id: 'bell3', name: 'Bell 3', file: 'bell3.mp3' },
    { id: 'bell4', name: 'Bell 4', file: 'bell4.mp3' },
    { id: 'bell5', name: 'Bell 5', file: 'bell5.mp3' },
    { id: 'cuack', name: 'Cuack', file: 'cuack.mp3' },
    { id: 'faahhhhh', name: 'Faaahhhhh', file: 'faahhhhh.mp3' },
    { id: 'wow', name: 'Wow!', file: 'wow.mp3' },
  ];


  private notifAudio: HTMLAudioElement | null = null;

  constructor() {
    effect(() => {
      this.applyToDocument(this.currentTheme(), this.currentFont(), this.currentSize(), this.currentDensity());
    });
  }

  setTheme(themeId: string): void {
    this.currentTheme.set(themeId);
    localStorage.setItem('pmmchat-theme', themeId);
  }

  setFont(font: FontFamily): void {
    this.currentFont.set(font);
    localStorage.setItem('pmmchat-font', font);
  }

  setSize(size: FontSize): void {
    this.currentSize.set(size);
    localStorage.setItem('pmmchat-size', size);
  }

  setDensity(density: MessageDensity): void {
    this.currentDensity.set(density);
    localStorage.setItem('pmmchat-density', density);
  }

  setAccentColor(color: string): void {
    this.accentColor.set(color);
    localStorage.setItem('pmmchat-accent', color);
    this.applyToDocument(this.currentTheme(), this.currentFont(), this.currentSize(), this.currentDensity());
  }

  setGlassIntensity(val: number): void {
    this.glassIntensity.set(val);
    localStorage.setItem('pmmchat-glass', String(val));
    this.applyToDocument(this.currentTheme(), this.currentFont(), this.currentSize(), this.currentDensity());
  }

  setWallpaper(wp: string): void {
    this.chatWallpaper.set(wp);
    localStorage.setItem('pmmchat-wallpaper', wp);
    this.applyToDocument(this.currentTheme(), this.currentFont(), this.currentSize(), this.currentDensity());
  }

  setCustomWallpaper(base64: string): void {
    this.customWallpaperUrl.set(base64);
    localStorage.setItem('pmmchat-custom-wp', base64);
    this.setWallpaper('custom-wallpaper');
  }

  toggleSound(): void {
    const val = !this.soundEnabled();
    this.soundEnabled.set(val);
    localStorage.setItem('pmmchat-sound', String(val));
  }

  toggleNotifications(): void {
    const val = !this.notificationsEnabled();
    this.notificationsEnabled.set(val);
    localStorage.setItem('pmmchat-notif', String(val));
  }

  toggleEnterToSend(): void {
    const val = !this.enterToSend();
    this.enterToSend.set(val);
    localStorage.setItem('pmmchat-enter-send', String(val));
  }

  toggleAlwaysShowTime(): void {
    const val = !this.alwaysShowTime();
    this.alwaysShowTime.set(val);
    localStorage.setItem('pmmchat-always-time', String(val));
  }

  setNotificationSound(soundFile: string): void {
    this.currentNotificationSound.set(soundFile);
    localStorage.setItem('pmmchat-notif-sound', soundFile);
    
    // Preview the sound
    this.playNotificationSound();
  }

  private fallbackAttempted = false;

  playNotificationSound(): void {
    if (!this.soundEnabled()) return;
    const currentFile = this.currentNotificationSound();
    
    // Use absolute path to avoid routing issues (public folder is served at root)
    const audio = new Audio(`/sounds/${currentFile}`);
    
    audio.onerror = () => {
      console.warn(`Sound file not found or unsupported: ${currentFile}`);
      this.handleFallback(currentFile);
    };

    audio.onplay = () => {
      this.fallbackAttempted = false;
    };

    audio.play().catch(e => {
      console.warn('Audio play blocked or failed:', e);
      if (e.name === 'NotSupportedError' || e.name === 'NotAllowedError') {
        this.handleFallback(currentFile);
      }
    });
  }

  private handleFallback(failedFile: string): void {
    if (!this.fallbackAttempted && this.soundOptions.length > 0) {
      const defaultFile = this.soundOptions[0].file;
      if (failedFile !== defaultFile) {
        this.fallbackAttempted = true;
        console.warn(`Falling back to default sound...`);
        this.setNotificationSound(defaultFile);
      }
    }
  }

  private applyToDocument(theme: string, font: string, size: string, density: string): void {
    const el = document.documentElement;
    const classes = Array.from(el.classList);
    for (const cls of classes) {
      if (cls.startsWith('theme-') || cls.startsWith('font-') || cls.startsWith('size-') || cls.startsWith('density-')) {
        el.classList.remove(cls);
      }
    }
    el.classList.add(theme, font, size, density);

    if (this.accentColor()) {
      el.style.setProperty('--app-primary', this.accentColor());
      const rgb = this.hexToRgb(this.accentColor());
      if (rgb) el.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    } else {
      el.style.removeProperty('--app-primary');
      el.style.removeProperty('--primary-rgb');
    }

    const blur = this.glassIntensity();
    el.style.setProperty('--app-glass-blur', `${blur}px`);
    el.style.setProperty('--glass-blur', `blur(${blur}px)`); 
    
    // Frosted effect: More blur = slightly more opacity and saturation
    const glassOpacity = 0.08 + (blur / 100); 
    el.style.setProperty('--app-glass-opacity', `${Math.min(glassOpacity, 0.6)}`);

    if (this.chatWallpaper()) {
      el.style.setProperty('--chat-wallpaper', this.chatWallpaper());
    } else {
      el.style.removeProperty('--chat-wallpaper');
    }

    if (this.customWallpaperUrl()) {
      el.style.setProperty('--chat-custom-bg', `url(${this.customWallpaperUrl()})`);
    } else {
      el.style.removeProperty('--chat-custom-bg');
    }
  }

  private hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private load(key: string, fallback: string): string {
    return localStorage.getItem(key) ?? fallback;
  }
}

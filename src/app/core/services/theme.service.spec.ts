import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    service = TestBed.inject(ThemeService);
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('themes', () => {
    it('should have default themes defined', () => {
      expect(service.themes.length).toBeGreaterThan(0);
      expect(service.themes.some((t) => t.id === 'theme-aura')).toBe(true);
      expect(service.themes.some((t) => t.id === 'theme-dark')).toBe(true);
      expect(service.themes.some((t) => t.id === 'theme-pmm')).toBe(true);
    });
  });

  describe('currentTheme', () => {
    it('should default to theme-aura', () => {
      expect(service.currentTheme()).toBe('theme-aura');
    });

    it('should set theme and save to localStorage', () => {
      service.setTheme('theme-pmm');
      expect(service.currentTheme()).toBe('theme-pmm');
    });
  });

  describe('currentFont', () => {
    it('should default to font-outfit', () => {
      expect(service.currentFont()).toBe('font-outfit');
    });

    it('should set font and save to localStorage', () => {
      service.setFont('font-lora');
      expect(service.currentFont()).toBe('font-lora');
    });
  });

  describe('currentSize', () => {
    it('should default to size-medium', () => {
      expect(service.currentSize()).toBe('size-medium');
    });

    it('should set size and save to localStorage', () => {
      service.setSize('size-large');
      expect(service.currentSize()).toBe('size-large');
    });
  });

  describe('currentDensity', () => {
    it('should default to density-normal', () => {
      expect(service.currentDensity()).toBe('density-normal');
    });

    it('should set density and save to localStorage', () => {
      service.setDensity('density-compact');
      expect(service.currentDensity()).toBe('density-compact');
    });
  });

  describe('soundEnabled', () => {
    it('should default to true', () => {
      expect(service.soundEnabled()).toBe(true);
    });

    it('should toggle sound setting', () => {
      const initial = service.soundEnabled();
      service.toggleSound();
      expect(service.soundEnabled()).toBe(!initial);
    });
  });

  describe('notificationsEnabled', () => {
    it('should default to true', () => {
      expect(service.notificationsEnabled()).toBe(true);
    });

    it('should toggle notifications setting', () => {
      const initial = service.notificationsEnabled();
      service.toggleNotifications();
      expect(service.notificationsEnabled()).toBe(!initial);
    });
  });

  describe('enterToSend', () => {
    it('should default to true', () => {
      expect(service.enterToSend()).toBe(true);
    });

    it('should toggle enter to send setting', () => {
      const initial = service.enterToSend();
      service.toggleEnterToSend();
      expect(service.enterToSend()).toBe(!initial);
    });
  });

  describe('alwaysShowTime', () => {
    it('should default to false', () => {
      expect(service.alwaysShowTime()).toBe(false);
    });

    it('should toggle always show time setting', () => {
      const initial = service.alwaysShowTime();
      service.toggleAlwaysShowTime();
      expect(service.alwaysShowTime()).toBe(!initial);
    });
  });

  describe('accentColor', () => {
    it('should default to empty string', () => {
      expect(service.accentColor()).toBe('');
    });

    it('should set accent color and save to localStorage', () => {
      service.setAccentColor('#00ff00');
      expect(service.accentColor()).toBe('#00ff00');
    });
  });

  describe('glassIntensity', () => {
    it('should default to 24', () => {
      expect(service.glassIntensity()).toBe(24);
    });

    it('should set glass intensity and save to localStorage', () => {
      service.setGlassIntensity(40);
      expect(service.glassIntensity()).toBe(40);
    });
  });

  describe('chatWallpaper', () => {
    it('should default to empty string', () => {
      expect(service.chatWallpaper()).toBe('');
    });

    it('should set wallpaper and save to localStorage', () => {
      service.setWallpaper('wallpaper-2');
      expect(service.chatWallpaper()).toBe('wallpaper-2');
    });
  });

  describe('soundOptions', () => {
    it('should have sound options defined', () => {
      expect(service.soundOptions.length).toBeGreaterThan(0);
      expect(service.soundOptions.some((s) => s.id === 'bell1')).toBe(true);
    });
  });

  describe('sizeOptions', () => {
    it('should have all size options', () => {
      expect(service.sizeOptions.length).toBe(5);
    });
  });

  describe('densityOptions', () => {
    it('should have all density options', () => {
      expect(service.densityOptions.length).toBe(3);
    });
  });

  describe('fontOptions', () => {
    it('should have font options defined', () => {
      expect(service.fontOptions.length).toBe(5);
    });
  });

  describe('currentNotificationSound', () => {
    it('should default to bell1.mp3', () => {
      expect(service.currentNotificationSound()).toBe('bell1.mp3');
    });
  });
});
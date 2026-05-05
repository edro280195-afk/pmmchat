import { vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';

afterEach(() => {
  try {
    TestBed.resetTestingModule();
  } catch {
    // Ignore if already reset
  }
});

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });

const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage, writable: true });

Object.defineProperty(window, 'crypto', {
  value: {
    ...window.crypto,
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
  writable: true,
});

window.Notification = {
  permission: 'granted',
  requestPermission: vi.fn().mockResolvedValue('granted'),
} as any;

Object.defineProperty(document, 'hasFocus', {
  writable: true,
  value: () => true,
});

HTMLAudioElement.prototype.play = vi.fn().mockReturnValue(Promise.resolve());
HTMLAudioElement.prototype.pause = vi.fn();
HTMLAudioElement.prototype.load = vi.fn();

const mockAudio = {
  play: vi.fn().mockReturnValue(Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  onerror: null,
  onplay: null,
};

window.Audio = vi.fn().mockImplementation(() => mockAudio);
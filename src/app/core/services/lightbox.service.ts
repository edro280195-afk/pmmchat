import { Injectable, signal, computed } from '@angular/core';
import { AttachmentInfo } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class LightboxService {
  private readonly _isOpen = signal(false);
  private readonly _images = signal<AttachmentInfo[]>([]);
  private readonly _currentIndex = signal(0);

  readonly isOpen = this._isOpen.asReadonly();
  readonly images = this._images.asReadonly();
  readonly currentIndex = this._currentIndex.asReadonly();

  readonly currentImage = computed(() => {
    const images = this._images();
    const index = this._currentIndex();
    return images.length > 0 ? images[index] : null;
  });

  open(images: AttachmentInfo[], startIndex = 0): void {
    if (images.length === 0) return;
    this._images.set(images);
    this._currentIndex.set(startIndex);
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
    // Optional: clear images after a delay to allow animations to finish
    setTimeout(() => {
      if (!this._isOpen()) {
        this._images.set([]);
        this._currentIndex.set(0);
      }
    }, 300);
  }

  next(): void {
    const images = this._images();
    if (images.length <= 1) return;
    this._currentIndex.update(i => (i + 1) % images.length);
  }

  prev(): void {
    const images = this._images();
    if (images.length <= 1) return;
    this._currentIndex.update(i => (i - 1 + images.length) % images.length);
  }

  setIndex(index: number): void {
    const images = this._images();
    if (index >= 0 && index < images.length) {
      this._currentIndex.set(index);
    }
  }
}

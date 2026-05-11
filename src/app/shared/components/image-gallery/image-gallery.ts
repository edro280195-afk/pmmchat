import { Component, inject, HostListener, ElementRef, ViewChild, AfterViewInit, effect } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { LightboxService } from '../../../core/services/lightbox.service';
import { SecureMediaPipe } from '../../pipes/secure-media.pipe';
import { FileService } from '../../../core/services/file.service';
import { ToastService } from '../../../core/services/toast.service';
import gsap from 'gsap';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [CommonModule, AsyncPipe, SecureMediaPipe],
  templateUrl: './image-gallery.html',
  styleUrl: './image-gallery.scss'
})
export class ImageGalleryComponent implements AfterViewInit {
  public lightbox = inject(LightboxService);
  private fileService = inject(FileService);
  private toastService = inject(ToastService);

  @ViewChild('galleryOverlay') overlay!: ElementRef<HTMLDivElement>;
  @ViewChild('imageContainer') imageContainer!: ElementRef<HTMLDivElement>;

  constructor() {
    // Animate entry/exit when isOpen changes
    effect(() => {
      const isOpen = this.lightbox.isOpen();
      if (isOpen) {
        this.animateIn();
      } else {
        this.animateOut();
      }
    });

    // Animate image change
    effect(() => {
      const index = this.lightbox.currentIndex();
      if (this.lightbox.isOpen()) {
        this.animateImageChange();
      }
    });
  }

  ngAfterViewInit(): void {
    // Initial state is handled by CSS and effects
  }

  private animateIn(): void {
    const el = this.overlay?.nativeElement;
    if (!el) return;

    gsap.set(el, { display: 'flex', pointerEvents: 'all' });
    gsap.to(el, {
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out'
    });

    gsap.from('.gallery__content', {
      scale: 0.9,
      opacity: 0,
      duration: 0.5,
      delay: 0.1,
      ease: 'back.out(1.4)'
    });
  }

  private animateOut(): void {
    const el = this.overlay?.nativeElement;
    if (!el) return;

    gsap.to(el, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => gsap.set(el, { display: 'none', pointerEvents: 'none' })
    });
  }

  private animateImageChange(): void {
    const img = this.imageContainer.nativeElement.querySelector('img');
    if (img) {
      gsap.fromTo(img, 
        { opacity: 0, scale: 0.95, filter: 'blur(10px)' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.4, ease: 'power2.out' }
      );
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (!this.lightbox.isOpen()) return;

    switch (event.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowRight':
        this.next();
        break;
      case 'ArrowLeft':
        this.prev();
        break;
    }
  }

  next(): void {
    this.lightbox.next();
  }

  prev(): void {
    this.lightbox.prev();
  }

  close(): void {
    this.lightbox.close();
  }

  download(): void {
    const current = this.lightbox.currentImage();
    if (current) {
      this.fileService.downloadFile(current.id, current.fileName);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.overlay.nativeElement) {
      this.close();
    }
  }
}

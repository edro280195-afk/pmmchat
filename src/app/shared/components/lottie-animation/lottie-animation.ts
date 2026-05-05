import { Component, input, signal, effect, ElementRef, ViewChild, AfterViewInit, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lottie-animation',
  standalone: true,
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <lottie-player
      #lottiePlayer
      [src]="src()"
      [autoplay]="autoplay()"
      [loop]="loop()"
      [background]="background()"
      [speed]="speed()"
      style="width: {{ width() }}; height: {{ height() }};"
    ></lottie-player>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    lottie-player {
      display: block;
    }
  `]
})
export class LottieAnimationComponent implements AfterViewInit {
  src = input.required<string>(); // URL to Lottie JSON
  autoplay = input<boolean>(true);
  loop = input<boolean>(true);
  background = input<string>('transparent');
  speed = input<number>(1);
  width = input<string>('200px');
  height = input<string>('200px');

  @ViewChild('lottiePlayer') player!: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    // Player is automatically initialized via attributes
  }

  // Method to play animation programmatically
  play(): void {
    if (this.player?.nativeElement) {
      (this.player.nativeElement as any).play();
    }
  }

  pause(): void {
    if (this.player?.nativeElement) {
      (this.player.nativeElement as any).pause();
    }
  }

  stop(): void {
    if (this.player?.nativeElement) {
      (this.player.nativeElement as any).stop();
    }
  }
}

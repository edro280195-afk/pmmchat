import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import lottie, { AnimationItem } from 'lottie-web';

@Component({
  selector: 'app-lottie-animation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      #lottieContainer
      [style.width]="width"
      [style.height]="height"
      [style.background]="background"
    ></div>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    div {
      display: block;
      overflow: hidden;
    }
  `]
})
export class LottieAnimationComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input({ required: true }) src!: string;
  @Input() autoplay = true;
  @Input() loop = true;
  @Input() background = 'transparent';
  @Input() speed = 1;
  @Input() width = '200px';
  @Input() height = '200px';

  @ViewChild('lottieContainer') container!: ElementRef<HTMLDivElement>;
  private animationItem: AnimationItem | null = null;
  private isViewInit = false;

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambia el src y ya estamos inicializados, recargamos
    if (this.isViewInit && changes['src']) {
      this.loadAnimation(this.src);
    }
    
    // Si cambia la velocidad
    if (this.animationItem && changes['speed']) {
      this.animationItem.setSpeed(this.speed);
    }
  }

  ngAfterViewInit(): void {
    this.isViewInit = true;
    this.loadAnimation(this.src);
    if (this.animationItem) {
      this.animationItem.setSpeed(this.speed);
    }
  }

  private loadAnimation(path: string) {
    if (!this.container?.nativeElement || !path) return;
    
    if (this.animationItem) {
      this.animationItem.destroy();
      this.animationItem = null;
    }

    this.animationItem = lottie.loadAnimation({
      container: this.container.nativeElement,
      renderer: 'svg',
      loop: this.loop,
      autoplay: this.autoplay,
      path: path,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet'
      }
    });
  }

  play(): void {
    this.animationItem?.play();
  }

  pause(): void {
    this.animationItem?.pause();
  }

  stop(): void {
    this.animationItem?.stop();
  }

  ngOnDestroy(): void {
    if (this.animationItem) {
      this.animationItem.destroy();
      this.animationItem = null;
    }
  }
}

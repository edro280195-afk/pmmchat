import { Component, Input, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import '@lottiefiles/lottie-player';

@Component({
  selector: 'app-lottie',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <lottie-player
      #player
      [src]="animationDataJson"
      [loop]="loop"
      [autoplay]="autoplay"
      [style.width]="width"
      [style.height]="height"
      speed="1"
      mode="normal">
    </lottie-player>
  `,
  styles: [`:host { display: inline-flex; align-items: center; justify-content: center; }`]
})
export class LottieComponent implements OnInit {
  @Input() animationData: any;
  @Input() loop: boolean = true;
  @Input() autoplay: boolean = true;
  @Input() width: string = '18px';
  @Input() height: string = '18px';

  get animationDataJson(): string {
    return JSON.stringify(this.animationData);
  }

  ngOnInit(): void {}
}

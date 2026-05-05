import { Component, ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, LottieAnimationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Welcome {
  // Animación muy sutil de un chat para la bienvenida (URL directa de CDN alternativo)
  lottieSrc = 'https://raw.githubusercontent.com/abhisheknaiidu/awesome-lottie/master/chat.json';
}

import { Directive, ElementRef, HostListener, Input, AfterViewInit, OnDestroy } from '@angular/core';
import gsap from 'gsap';

@Directive({
  selector: '[appReactionAnim]',
  standalone: true
})
export class ReactionAnimDirective implements AfterViewInit, OnDestroy {
  @Input('appReactionAnim') emoji: string = '';
  private hoverTween: gsap.core.Tween | null = null;
  private idleTween: gsap.core.Tween | null = null;

  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    // Some emojis have a continuous idle animation (like a subtle heartbeat)
    if (this.emoji === '❤️' || this.emoji === '💖' || this.emoji === '🔥') {
      this.idleTween = gsap.to(this.el.nativeElement, {
        scale: 1.08,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        paused: false
      });
    }
  }

  ngOnDestroy() {
    if (this.idleTween) this.idleTween.kill();
    if (this.hoverTween) this.hoverTween.kill();
    gsap.killTweensOf(this.el.nativeElement);
  }

  @HostListener('mouseenter') onMouseEnter() {
    if (this.idleTween) this.idleTween.pause();

    // Determine the animation based on the emoji type
    let vars: gsap.TweenVars = { scale: 1.3, duration: 0.5, ease: 'elastic.out(1, 0.3)' };

    if (this.emoji === '👍' || this.emoji === '👋') {
      vars = { scale: 1.25, rotation: -15, duration: 0.4, ease: 'back.out(1.5)' };
    } else if (this.emoji === '😂' || this.emoji === '🤣') {
      vars = { scale: 1.2, rotation: 5, duration: 0.1, yoyo: true, repeat: 3 };
    } else if (this.emoji === '❤️') {
      vars = { scale: 1.4, duration: 0.4, ease: 'elastic.out(1.2, 0.4)' };
    }

    this.hoverTween = gsap.to(this.el.nativeElement, vars);
  }

  @HostListener('mouseleave') onMouseLeave() {
    if (this.hoverTween) this.hoverTween.kill();
    
    gsap.to(this.el.nativeElement, {
      scale: 1,
      rotation: 0,
      duration: 0.3,
      ease: 'power2.out',
      onComplete: () => {
        if (this.idleTween) this.idleTween.play();
      }
    });
  }
}

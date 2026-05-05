import { Directive, ElementRef, OnInit, OnDestroy, inject, input, effect } from '@angular/core';
import { OverlayScrollbars } from 'overlayscrollbars';

@Directive({
  selector: '[appOverlayScroll]',
  standalone: true
})
export class OverlayScrollDirective implements OnInit, OnDestroy {
  options = input<any>({});
  events = input<any>({});

  private scrollbars: any = null;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.scrollbars = OverlayScrollbars(this.el.nativeElement, {
      ...this.options(),
      ...this.events()
    });
  }

  ngOnDestroy(): void {
    if (this.scrollbars) {
      this.scrollbars.destroy();
    }
  }
}

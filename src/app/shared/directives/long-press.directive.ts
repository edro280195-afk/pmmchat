import { Directive, Output, EventEmitter, HostListener } from '@angular/core';

@Directive({
  selector: '[longPress]',
  standalone: true
})
export class LongPressDirective {
  @Output() longPress = new EventEmitter<any>();

  private timeout: any;
  private isLongPressing = false;

  @HostListener('touchstart', ['$event'])
  @HostListener('mousedown', ['$event'])
  onPress(event: Event): void {
    this.isLongPressing = false;
    this.timeout = setTimeout(() => {
      this.isLongPressing = true;
      this.longPress.emit(event);
      // Prevents click after long press
      event.preventDefault();
      event.stopPropagation();
    }, 500); // 500ms for long press
  }

  @HostListener('touchend')
  @HostListener('mouseup')
  @HostListener('mouseleave')
  onRelease(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    if (this.isLongPressing) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}

import { Directive, ElementRef, HostListener, inject, AfterViewInit } from '@angular/core';

/**
 * Directiva que auto-expande un textarea según su contenido.
 * Máximo 160px, después aparece scroll.
 */
@Directive({
  selector: 'textarea[appAutoResize]',
  standalone: true,
})
export class AutoResizeDirective implements AfterViewInit {
  private el = inject(ElementRef<HTMLTextAreaElement>);

  ngAfterViewInit(): void {
    // Ajuste inicial en caso de que ya haya contenido
    this.resize();
  }

  @HostListener('input')
  onInput(): void {
    this.resize();
  }

  /** Llamar externamente cuando el modelo cambia desde código (ej. al limpiar el campo) */
  resize(): void {
    const el = this.el.nativeElement;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }
}
